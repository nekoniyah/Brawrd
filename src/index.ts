import Hammer from "hammerjs";
import LocalForage from "localforage";

let newBtn = document.querySelector(".new")! as HTMLButtonElement;
const nav = document.querySelector(".nav")! as HTMLDivElement;
const container = document.querySelector("#container")! as HTMLDivElement;

const toolbarDiv = document.querySelector(".toolbar")! as HTMLDivElement;
const newBoardBtn = document.querySelector(".addBoard")! as HTMLButtonElement;
const newPawnBtn = document.querySelector(".addPawn")! as HTMLButtonElement;
const deleteTab = document.querySelector(".delete")! as HTMLButtonElement;

let doubleTap = new Hammer(container);
doubleTap.add(new Hammer.Tap({ enable: true, event: "doubletap" }));

let actual: string | null = null;

let listeners = new Map<string, any>();

let data: {
  id: string;
  pawns: {
    name: string;
    imageData?: string;
    colorHex?: string;
  }[];
  boardData: string | null;
}[] = [];

function handleAnyImageUpload(
  callback: (data: string) => Promise<void> | void
) {
  let input = document.createElement("input");
  input.type = "file";
  input.click();
  input.accept = "image/*";

  input.addEventListener("change", async (ev) => {
    let buf = await input.files![0]!.arrayBuffer();
    let fileBlob = new Blob([buf]);
    let bitmap = await createImageBitmap(fileBlob);
    let canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    let ctx = canvas.getContext("2d")!;

    ctx.drawImage(bitmap, 0, 0);

    let d = canvas.toDataURL("image/png");

    await callback(d);
  });
}

function updateTabData(id: string, d: Partial<(typeof data)[0]>) {
  let actualData = data.find((k) => k.id === id)!;

  let newData = actualData;

  // Don't merge now! The array of pawns will be overwritten
  let newPawnsData = actualData.pawns;

  if (d.pawns && d.pawns !== actualData.pawns) {
    newPawnsData.push(...d.pawns);
  }

  if (d.pawns) newData = { ...newData, ...d, pawns: newPawnsData };
  else newData = { ...newData, ...d };

  data = data.filter((d) => d.id !== id);
  data.push(newData);

  return data;
}

function handleBoardUpload() {
  handleAnyImageUpload((d) => {
    if (actual) {
      data = updateTabData(actual, { boardData: d });
      updateBoardImage();
    }
  });
}

function updateBoardImage() {
  let d = data.find((k) => k.id === actual)!;

  //@ts-ignore
  container.querySelector(".bg")!.src = d.boardData;
}

newBoardBtn.addEventListener("click", (ev) => {
  handleBoardUpload();
});

function newBoardTab(name?: string) {
  const tab = document.createElement("button");
  tab.classList.add("tab");
  let n = name ?? `Tab ${data.length + 1}`;
  tab.textContent = n;

  nav.insertBefore(tab, nav.children.item(1));

  data.push({ id: n, pawns: [], boardData: null });

  actual = n;

  resetTabClickListeners();
}

function addPawnElement(pawnData: { name: string; imageData: string }) {
  let div = document.createElement("div");
  div.classList.add("pawn");

  let label = document.createElement("span");
  label.textContent = pawnData.name;

  div.appendChild(label);

  let img = document.createElement("img");

  img.src = pawnData.imageData;

  div.appendChild(img);

  container.appendChild(div);
}

function init() {
  container.innerHTML = `<img src="" alt="" class="bg" />`;

  let actualthing = data.find((d) => d.id === actual)!;
  if (!actualthing) return;

  if ("boardData" in actualthing) updateBoardImage();

  if ("pawns" in actualthing)
    actualthing.pawns.forEach((p) => {
      addPawnElement({ imageData: p.imageData!, name: p.name });
    });
}

function handleNewPawn() {
  let name = prompt("Name?");
  if (!name) return;

  handleAnyImageUpload((d) => {
    let daPawn = {
      name,
      imageData: d,
    };

    addPawnElement(daPawn);
    updateTabData(actual!, { pawns: [daPawn] });
  });
}

deleteTab.addEventListener("click", (ev) => {
  data = data.filter((d) => d.id !== actual);
  resetTabElements();
});

newPawnBtn.addEventListener("click", () => handleNewPawn());

function resetTabElements() {
  // show tabs

  nav.innerHTML = `<button class="new">+</button>`;

  let keys = data.map((k) => k.id);

  for (let id of keys) {
    const tab = document.createElement("button");
    tab.classList.add("tab");
    tab.textContent = id;

    nav.insertBefore(tab, nav.children.item(1));
  }

  newBtn = document.querySelector(".new")! as HTMLButtonElement;

  newBtn.addEventListener("click", (ev) => {
    newBoardTab();
  });
}

if (localStorage.getItem("brawrd-data")) {
  data = (await LocalForage.getItem("brawrd-data"))! ?? [];

  // show tabs

  resetTabElements();
  resetTabClickListeners();
}

function resetTabClickListeners() {
  nav.querySelectorAll("button").forEach((btn) => {
    if (btn.classList.contains("new")) return;
    if (listeners.has(btn.textContent))
      btn.removeEventListener("click", listeners.get(btn.textContent));

    let daListener = () => {
      listeners.set(btn.textContent, daListener);
      actual = btn.textContent;
      init();
    };

    btn.addEventListener("click", (ev) => daListener());
  });
}

setInterval(async () => {
  if (actual) toolbarDiv.hidden = false;
  else toolbarDiv.hidden = true;

  await LocalForage.setItem("brawrd-data", data);
}, 100);
