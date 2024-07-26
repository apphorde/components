import { load, install } from "https://codemirror.jsfn.run/index.mjs";
import * as FileApi from "https://file.api.apphor.de/index.mjs";
import * as AuthApi from "https://auth.api.apphor.de/index.mjs";

let state = {
  binId: "",
  fileId: location.hash || "",
  fileContent: "",
  fileList: [],
};

let editor;

window.state = state;

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
    await FileApi.writeFile(state.binId, state.fileId, editor.getValue());
  }
}

async function updatePreview() {
  const value = editor.getValue();
  preview.innerHTML = value;
  state.fileContent = value;
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
  state.fileContent = content;

  updateEditor();
}

function updateEditor() {
  if (editor.getValue() !== state.fileContent) {
    editor.setValue(state.fileContent);
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
    target: ".editor",
    name: "editor",
    lineNumbers: true,
    language: "javascript",
  });

  editor = await getEditor("editor");
  editor.on("change", debounce(updatePreview));
  editor.on("change", debounce(onContentChange, 1000));

  updateAuth();
}

main();
