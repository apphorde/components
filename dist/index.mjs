import { load, install } from "https://codemirror.jsfn.run/index.mjs";
import * as FileApi from "https://file.api.apphor.de/index.mjs";
import * as AuthApi from "https://auth.api.apphor.de/index.mjs";

function debounce(fn, time = 200) {
  let t = 0;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), time);
  };
}

let state = {
  binId: "",
  fileId: location.hash || "",
  fileContent: "",
  fileList: [],
};

let editor;

window.state = state;

async function onAddFile() {
  const file = await FileApi.createFile(state.binId);
  state.fileId = file.fileId;
  await updateFileList();
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
  await FileApi.writeFile(state.binId, state.fileId, editor.getValue());
}

async function main() {
  auth.onclick = onSignInOrOut;
  addFile.onclick = onAddFile;

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
  fileSelector.innerHTML = state.fileList
    .map((f) => `<option value="${f}">${f}</option>`)
    .join("");

  fileSelector.onchange = () => {
    const value = fileSelector.options[fileSelector.selectedIndex].value;
    console.log(value);
    state.fileId = value;
    updateFileContent();
  };
}

async function updateFileContent() {
  if (!state.fileId) return;

  const req = await FileApi.readFile(state.bindId, state.fileId);
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

main();
