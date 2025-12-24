import Hammer from "hammerjs";
import LocalForage from "localforage";

// Types for better structure
interface PawnData {
  name: string;
  imageData?: string;
  colorHex?: string;
  x: number;
  y: number;
  id: string;
}

interface BoardData {
  id: string;
  name: string;
  pawns: PawnData[];
  boardData: string | null;
}

// Main application class
class BrawrdApp {
  private boards: BoardData[] = [];
  private currentBoardId: string | null = null;
  private saveTimeout: NodeJS.Timeout | null = null;
  private pawnCounter = 0;

  // DOM elements
  private container!: HTMLDivElement;
  private toolbarDiv!: HTMLDivElement;
  private deleteButton!: HTMLButtonElement;
  private newBoardButton!: HTMLButtonElement;
  private addBoardButton!: HTMLButtonElement;
  private addPawnButton!: HTMLButtonElement;
  private bgImage!: HTMLImageElement;

  constructor() {
    this.init();
  }

  private async init() {
    this.initDOM();
    this.setupEventListeners();
    await this.loadData();
    this.setupMobileOptimizations();
  }

  private initDOM() {
    // Get DOM elements with correct class names from your HTML
    this.container = document.querySelector("#container") as HTMLDivElement;
    this.toolbarDiv = document.querySelector(".toolbar") as HTMLDivElement;
    this.deleteButton = document.querySelector(".delete") as HTMLButtonElement;
    this.newBoardButton = document.querySelector(".new") as HTMLButtonElement;
    this.addBoardButton = document.querySelector(
      ".addBoard"
    ) as HTMLButtonElement;
    this.addPawnButton = document.querySelector(
      ".addPawn"
    ) as HTMLButtonElement;
    this.bgImage = document.querySelector(".bg") as HTMLImageElement;

    // Check if all required elements exist
    if (!this.container) {
      console.error("Container element #container not found");
      return;
    }

    console.log("DOM initialized successfully");
    this.updateUI();
  }

  private setupEventListeners() {
    // Board management - with null checks
    this.newBoardButton?.addEventListener("click", () => this.createNewBoard());
    this.addBoardButton?.addEventListener("click", () =>
      this.uploadBoardImage()
    );
    this.addPawnButton?.addEventListener("click", () => this.addPawn());
    this.deleteButton?.addEventListener("click", () =>
      this.deleteCurrentBoard()
    );

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => this.handleKeyboard(e));
  }

  private setupMobileOptimizations() {
    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener(
      "touchend",
      (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      },
      false
    );

    // Prevent context menu on long press
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    // Prevent scrolling when dragging
    document.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches.length > 1) e.preventDefault();
      },
      { passive: false }
    );
  }

  private async loadData() {
    try {
      const savedData = (await LocalForage.getItem(
        "brawrd-data"
      )) as BoardData[];
      if (savedData && Array.isArray(savedData)) {
        this.boards = savedData;
        if (this.boards.length > 0) {
          this.switchToBoard(this.boards[0]!.id);
        }
      }
      console.log("Loaded boards:", this.boards.length);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  }

  private debouncedSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(async () => {
      try {
        await LocalForage.setItem("brawrd-data", this.boards);
        console.log("Data saved successfully");
      } catch (error) {
        console.error("Failed to save data:", error);
      }
    }, 1000);
  }

  private createNewBoard() {
    const name = prompt("Board name:");
    if (!name?.trim()) return;

    const newBoard: BoardData = {
      id: `board-${Date.now()}`,
      name: name.trim(),
      pawns: [],
      boardData: null,
    };

    this.boards.push(newBoard);
    this.switchToBoard(newBoard.id);
    this.debouncedSave();
    this.hapticFeedback("light");
  }

  private switchToBoard(boardId: string) {
    this.currentBoardId = boardId;
    this.renderCurrentBoard();
    this.updateUI();
  }

  private getCurrentBoard(): BoardData | null {
    return this.boards.find((b) => b.id === this.currentBoardId) || null;
  }

  private renderCurrentBoard() {
    // Clear pawns but keep the background image element
    const pawns = this.container.querySelectorAll(".pawn");
    pawns.forEach((pawn) => pawn.remove());

    const currentBoard = this.getCurrentBoard();

    // Get or create the background image element
    let bgImg = this.container.querySelector(".bg") as HTMLImageElement;
    if (!bgImg) {
      bgImg = document.createElement("img");
      bgImg.className = "bg";
      bgImg.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 1;
      `;
      this.container.appendChild(bgImg);
    }

    if (!currentBoard) {
      // Clear background if no board
      bgImg.src = "";
      bgImg.style.display = "none";
      return;
    }

    // Set board background if exists
    if (currentBoard.boardData) {
      bgImg.src = currentBoard.boardData;
      bgImg.style.display = "block";
    } else {
      bgImg.src = "";
      bgImg.style.display = "none";
    }

    // Render pawns
    currentBoard.pawns.forEach((pawn) => this.renderPawn(pawn));
  }

  private renderPawn(pawnData: PawnData) {
    const div = document.createElement("div");
    div.classList.add("pawn");
    div.dataset.pawnId = pawnData.id;
    div.style.left = `${pawnData.x}px`;
    div.style.top = `${pawnData.y}px`;
    div.style.position = "absolute";
    div.style.zIndex = "10";

    // Pawn label
    const label = document.createElement("span");
    label.textContent = pawnData.name;
    label.style.display = "block";
    label.style.textAlign = "center";
    label.style.background = "rgba(0,0,0,0.7)";
    label.style.color = "white";
    label.style.padding = "2px 8px";
    label.style.borderRadius = "12px";
    label.style.fontSize = "0.8rem";
    label.style.marginBottom = "4px";
    label.style.userSelect = "none";
    div.appendChild(label);

    // Pawn image or color
    if (pawnData.imageData) {
      const img = document.createElement("img");
      img.src = pawnData.imageData;
      img.style.width = "60px";
      img.style.height = "60px";
      img.style.borderRadius = "50%";
      img.style.objectFit = "cover";
      img.style.border = "2px solid white";
      img.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      img.draggable = false;
      div.appendChild(img);
    } else if (pawnData.colorHex) {
      const colorDiv = document.createElement("div");
      colorDiv.style.width = "60px";
      colorDiv.style.height = "60px";
      colorDiv.style.borderRadius = "50%";
      colorDiv.style.backgroundColor = pawnData.colorHex;
      colorDiv.style.border = "2px solid white";
      colorDiv.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      div.appendChild(colorDiv);
    }

    this.container.appendChild(div);
    this.makePawnDraggable(div, pawnData);
  }

  private makePawnDraggable(pawnElement: HTMLElement, pawnData: PawnData) {
    const hammer = new Hammer(pawnElement);
    hammer.get("pan").set({ direction: Hammer.DIRECTION_ALL });

    let startX = 0,
      startY = 0;
    let isDragging = false;

    hammer.on("panstart", (ev) => {
      isDragging = true;
      const rect = pawnElement.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      startX = rect.left - containerRect.left;
      startY = rect.top - containerRect.top;
      pawnElement.style.zIndex = "1000";
      pawnElement.style.transform = "scale(1.1)";
      this.hapticFeedback("light");
    });

    hammer.on("panmove", (ev) => {
      if (!isDragging) return;
      const newX = Math.max(
        0,
        Math.min(this.container.clientWidth - 60, startX + ev.deltaX)
      );
      const newY = Math.max(
        0,
        Math.min(this.container.clientHeight - 60, startY + ev.deltaY)
      );
      pawnElement.style.left = `${newX}px`;
      pawnElement.style.top = `${newY}px`;
    });

    hammer.on("panend", (ev) => {
      isDragging = false;
      pawnElement.style.zIndex = "10";
      pawnElement.style.transform = "scale(1)";

      const newX = parseInt(pawnElement.style.left);
      const newY = parseInt(pawnElement.style.top);
      this.updatePawnPosition(pawnData.id, newX, newY);
      this.hapticFeedback("light");
    });

    // Long press to delete
    hammer.get("press").set({ time: 800 });
    hammer.on("press", () => {
      if (confirm(`Delete pawn "${pawnData.name}"?`)) {
        this.deletePawn(pawnData.id);
        this.hapticFeedback("heavy");
      }
    });
  }

  private updatePawnPosition(pawnId: string, x: number, y: number) {
    const currentBoard = this.getCurrentBoard();
    if (!currentBoard) return;

    const pawn = currentBoard.pawns.find((p) => p.id === pawnId);
    if (pawn) {
      pawn.x = x;
      pawn.y = y;
      this.debouncedSave();
    }
  }

  private addPawn() {
    const name = prompt("Pawn name:");
    if (!name?.trim()) return;

    const choice = confirm("Add image? (Cancel for color)");

    if (choice) {
      this.uploadPawnImage(name.trim());
    } else {
      this.addColorPawn(name.trim());
    }
  }

  private addColorPawn(name: string) {
    const color = prompt(
      "Enter hex color (e.g., #ff0000):",
      "#" + Math.floor(Math.random() * 16777215).toString(16)
    );
    if (!color) return;

    const currentBoard = this.getCurrentBoard();
    if (!currentBoard) {
      alert("Please create a board first");
      return;
    }

    const pawn: PawnData = {
      id: `pawn-${this.pawnCounter++}-${Date.now()}`,
      name,
      colorHex: color,
      x: Math.random() * Math.max(0, this.container.clientWidth - 60),
      y: Math.random() * Math.max(0, this.container.clientHeight - 60),
    };

    currentBoard.pawns.push(pawn);
    this.renderPawn(pawn);
    this.debouncedSave();
    this.hapticFeedback("light");
  }

  private uploadPawnImage(name: string) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.addEventListener("change", async (ev) => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const imageData = await this.processImage(file, 512);
        const currentBoard = this.getCurrentBoard();
        if (!currentBoard) {
          alert("Please create a board first");
          return;
        }

        const pawn: PawnData = {
          id: `pawn-${this.pawnCounter++}-${Date.now()}`,
          name,
          imageData,
          x: Math.random() * Math.max(0, this.container.clientWidth - 60),
          y: Math.random() * Math.max(0, this.container.clientHeight - 60),
        };

        currentBoard.pawns.push(pawn);
        this.renderPawn(pawn);
        this.debouncedSave();
        this.hapticFeedback("light");
      } catch (error) {
        console.error("Image upload failed:", error);
        alert("Failed to upload image. Please try again.");
      }
    });

    input.click();
  }

  private uploadBoardImage() {
    const currentBoard = this.getCurrentBoard();
    if (!currentBoard) {
      alert("Please create a board first");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.addEventListener("change", async (ev) => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const imageData = await this.processImage(file, 1920);
        currentBoard.boardData = imageData;
        this.renderCurrentBoard();
        this.debouncedSave();
        this.hapticFeedback("light");
      } catch (error) {
        console.error("Board image upload failed:", error);
        alert("Failed to upload board image. Please try again.");
      }
    });

    input.click();
  }

  private async processImage(
    file: File,
    maxSize: number = 512
  ): Promise<string> {
    // Size check
    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      throw new Error("Image too large. Please choose an image under 10MB.");
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;

          // Calculate optimal size
          const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          // Draw and compress
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  }

  private deletePawn(pawnId: string) {
    const currentBoard = this.getCurrentBoard();
    if (!currentBoard) return;

    const pawnIndex = currentBoard.pawns.findIndex((p) => p.id === pawnId);
    if (pawnIndex !== -1) {
      currentBoard.pawns.splice(pawnIndex, 1);

      // Remove from DOM
      const pawnElement = document.querySelector(`[data-pawn-id="${pawnId}"]`);
      if (pawnElement) {
        pawnElement.remove();
      }

      this.debouncedSave();
    }
  }

  private deleteCurrentBoard() {
    if (!this.currentBoardId) {
      alert("No board to delete");
      return;
    }

    const currentBoard = this.getCurrentBoard();
    if (!currentBoard) return;

    if (!confirm(`Delete board "${currentBoard.name}"? This cannot be undone.`))
      return;

    const boardIndex = this.boards.findIndex(
      (b) => b.id === this.currentBoardId
    );
    if (boardIndex !== -1) {
      this.boards.splice(boardIndex, 1);

      // Switch to another board or clear
      if (this.boards.length > 0) {
        this.switchToBoard(this.boards[0]!.id);
      } else {
        this.currentBoardId = null;
        this.container.innerHTML = "";
        if (this.bgImage) {
          this.bgImage.src = "";
          this.bgImage.style.display = "none";
        }
      }

      this.updateUI();
      this.debouncedSave();
      this.hapticFeedback("heavy");
    }
  }

  private updateUI() {
    const hasBoard = this.getCurrentBoard() !== null;

    // Show/hide toolbar based on current board
    if (this.toolbarDiv) {
      this.toolbarDiv.style.display = hasBoard ? "flex" : "none";
    }

    if (this.deleteButton) {
      this.deleteButton.style.display = hasBoard ? "block" : "none";
    }

    // Update page title
    const currentBoard = this.getCurrentBoard();
    if (currentBoard) {
      document.title = `Brawrd - ${currentBoard.name}`;
    } else {
      document.title = "Brawrd - Board Editor";
    }

    // Add board selector if multiple boards
    this.updateBoardSelector();
  }

  private updateBoardSelector() {
    // Remove existing selector
    const existingSelector = document.querySelector(".board-selector");
    if (existingSelector) existingSelector.remove();

    if (this.boards.length <= 1) return;

    const selector = document.createElement("select");
    selector.className = "board-selector";
    selector.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      padding: 8px;
      border-radius: 8px;
      border: 1px solid #ccc;
      background: white;
      z-index: 1001;
      font-size: 14px;
      min-width: 120px;
    `;

    this.boards.forEach((board) => {
      const option = document.createElement("option");
      option.value = board.id;
      option.textContent = board.name;
      option.selected = board.id === this.currentBoardId;
      selector.appendChild(option);
    });

    selector.addEventListener("change", (e) => {
      const target = e.target as HTMLSelectElement;
      this.switchToBoard(target.value);
    });

    document.body.appendChild(selector);
  }

  private handleKeyboard(e: KeyboardEvent) {
    // Only handle if not typing in an input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;

    switch (e.key) {
      case "n":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.createNewBoard();
        }
        break;
      case "p":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.addPawn();
        }
        break;
      case "Delete":
      case "Backspace":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.deleteCurrentBoard();
        }
        break;
    }
  }

  private hapticFeedback(type: "light" | "medium" | "heavy" = "light") {
    if ("vibrate" in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50],
      };
      navigator.vibrate(patterns[type]);
    }
  }

  // Public method to get app state (useful for debugging)
  public getState() {
    return {
      boards: this.boards,
      currentBoardId: this.currentBoardId,
      boardCount: this.boards.length,
      currentBoard: this.getCurrentBoard(),
      pawnsInCurrentBoard: this.getCurrentBoard()?.pawns.length || 0,
    };
  }

  // Public method to export data
  public exportData() {
    const data = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      boards: this.boards,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `brawrd-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Public method to import data
  public importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.addEventListener("change", async (e) => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.boards && Array.isArray(data.boards)) {
          if (confirm("Import data? This will replace your current boards.")) {
            this.boards = data.boards;
            if (this.boards.length > 0) {
              this.switchToBoard(this.boards[0]!.id);
            } else {
              this.currentBoardId = null;
              this.renderCurrentBoard();
            }
            this.updateUI();
            this.debouncedSave();
            alert("Data imported successfully!");
          }
        } else {
          alert("Invalid file format");
        }
      } catch (error) {
        console.error("Import failed:", error);
        alert("Failed to import data. Please check the file format.");
      }
    });

    input.click();
  }
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new BrawrdApp();

  // Make app available globally for debugging
  (window as any).brawrd = app;

  console.log("Brawrd app initialized successfully");
  console.log(
    "Available commands: brawrd.getState(), brawrd.exportData(), brawrd.importData()"
  );
});

// Export for module systems
export default BrawrdApp;
