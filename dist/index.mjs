import { load, install } from "https://codemirror.jsfn.run/index.mjs";
import * as FileApi from "https://file.api.apphor.de/index.mjs";
import * as AuthApi from "https://auth.api.apphor.de/index.mjs";

let state = {
  binId: "",
  fileId: location.hash || "",
  fileContent: "",
  fileList: [],
};

window.state = state;

let htmlEditor, jsEditor;

async function onSelectFile() {
  const value = fileSelector.options[fileSelector.selectedIndex].value;
  state.fileId = value;
  await updateFileContent();
}

async function onAddFile() {
  const file = await FileApi.createFile(state.binId);
  state.fileId = file.fileId;
  await updateFileList();
  await updateFileContent();
}

async function onSignInOrOut() {
  const isAuth = await AuthApi.isAuthenticated();

  if (isAuth) {
    await AuthApi.signOut();
    editor.setValue("");
    updatePreview();
  } else {
    await AuthApi.signIn(true);
  }

  updateAuth();
}

async function onContentChange() {
  if (state.binId && state.fileId) {
    const content = JSON.stringify({
      js: jsEditor.getValue(),
      html: htmlEditor.getValue(),
    });
    await FileApi.writeFile(state.binId, state.fileId, content);
  }
}

async function updatePreview() {
  const value = htmlEditor.getValue();
  preview.innerHTML = value;
  state.fileContent = value;
  componentUrl.innerText = `https://${location.host}/s/${state.binId}/${state.fileId}.mjs`;
}

async function updateAuth() {
  const isAuth = await AuthApi.isAuthenticated();
  state.isAuth = isAuth;
  auth.innerText = isAuth ? "sign out" : "sign in";

  if (isAuth) {
    state.profile = await AuthApi.getProfile();
    await updateBinId();
    await updateFileList();
    await updateFileContent();

    if (!state.fileList.length) {
      onAddFile();
    }

    userName.innerText = state.profile.name || state.profile.email;
  }
}

function updateFileSelector() {
  fileSelector.innerHTML =
    `<option value="">-- Select project --</option>` +
    state.fileList
      .map(
        (f) =>
          `<option value="${f}" ${
            (f === state.fileId && " selected") || ""
          }>${f}</option>`
      )
      .join("");
}

async function updateFileContent() {
  if (!state.fileId) return;

  const req = await FileApi.readFile(state.binId, state.fileId);
  const content = await req.text();

  try {
    state.fileContent = JSON.parse(content);
    updateEditors();
  } catch (e) {
    console.log(e);
    state.fileContent = { js: "", css: "" };
    // TODO editors are out of sync
  }
}

function updateEditors() {
  if (jsEditor.getValue() !== state.fileContent.js) {
    jsEditor.setValue(state.fileContent.js);
  }

  if (htmlEditor.getValue() !== state.fileContent.html) {
    htmlEditor.setValue(state.fileContent.html);
  }
}

async function updateFileList() {
  state.fileList = [];

  if (state.isAuth && state.binId) {
    state.fileList = await FileApi.listFiles(state.binId);
  }

  updateFileSelector();
}

async function updateBinId() {
  state.binId = await AuthApi.getPropertyNS("binId");

  if (!state.binId) {
    const bin = await FileApi.createBin();
    state.binId = bin.binId;
    await AuthApi.setPropertyNS("binId", state.binId);
  }
}

function debounce(fn, time = 200) {
  let t = 0;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), time);
  };
}

async function main() {
  auth.onclick = onSignInOrOut;
  addFile.onclick = onAddFile;
  fileSelector.onchange = onSelectFile;

  await load();
  await install("", {
    target: ".editor-html .editor",
    name: "htmlEditor",
    lineNumbers: true,
    language: "html",
  });

  await install("", {
    target: ".editor-js .editor",
    name: "jsEditor",
    lineNumbers: true,
    language: "javascript",
  });

  jsEditor = await getEditor("jsEditor");
  htmlEditor = await getEditor("htmlEditor");

  [jsEditor, htmlEditor].forEach((editor) => {
    editor.on("change", debounce(updatePreview));
    editor.on("change", debounce(onContentChange, 1000));
  });

  updateAuth();
}

main();
