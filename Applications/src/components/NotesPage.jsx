import React, { useEffect, useMemo, useRef, useState } from "react";
import { auth } from "../firebase-config";
import { useDarkMode } from "../contexts/DarkModeContext";
import { useLang } from "../contexts/LanguageContext";
import { useConfirm } from "../contexts/ConfirmDialogContext";
import { useSidebarCollapse } from "../contexts/SidebarCollapseContext";
import Sidebar from "./Sidebar";
import { driveService } from "../services/drive-service";
import QuizModal from './analytics/QuizModal';
import { quizService } from '../services/quiz-service';

const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";

const isTextMime = (mime) => {
  const v = String(mime || "").toLowerCase();
  return (
    v.startsWith("text/") ||
    [
      "application/json",
      "application/xml",
      "application/javascript",
      "application/x-yaml",
      "application/yaml",
    ].includes(v)
  );
};

const isNoteFile = (file) =>
  file?.mimeType === GOOGLE_DOC_MIME ||
  isTextMime(file?.mimeType) ||
  /\.(txt|md|markdown|csv|log)$/i.test(String(file?.name || ""));

const byModifiedDesc = (a, b) =>
  new Date(b?.modifiedTime || 0).getTime() -
  new Date(a?.modifiedTime || 0).getTime();

const formatSize = (bytes) => {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

/* â”€â”€ helpers for display â”€â”€ */
const formatRelativeDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "NOW";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

const getFileExtension = (name) => {
  const ext = String(name || "")
    .split(".")
    .pop()
    .toUpperCase();
  return ext || "";
};

const getFileTypeInfo = (file) => {
  const mime = String(file?.mimeType || "").toLowerCase();
  const ext = getFileExtension(file?.name);

  if (mime.includes("pdf") || ext === "PDF")
    return {
      icon: "fa-file-pdf",
      color: "#dc2626",
      bgColor: "rgba(220,38,38,0.1)",
      label: "PDF",
    };
  if (
    mime.includes("image") ||
    ["PNG", "JPG", "JPEG", "GIF", "SVG", "WEBP"].includes(ext)
  )
    return {
      icon: "fa-file-image",
      color: "#059669",
      bgColor: "rgba(5,150,105,0.1)",
      label: ext || "IMG",
    };
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    ["XLSX", "XLS", "CSV"].includes(ext)
  )
    return {
      icon: "fa-file-excel",
      color: "#0d9488",
      bgColor: "rgba(13,148,136,0.1)",
      label: ext || "XLSX",
    };
  if (
    mime.includes("video") ||
    ["MP4", "AVI", "MOV", "WEBM", "MKV"].includes(ext)
  )
    return {
      icon: "fa-file-video",
      color: "#ea580c",
      bgColor: "rgba(234,88,12,0.1)",
      label: ext || "VIDEO",
    };
  if (mime.includes("audio") || ["MP3", "WAV", "OGG", "FLAC"].includes(ext))
    return {
      icon: "fa-file-audio",
      color: "#7c3aed",
      bgColor: "rgba(124,58,237,0.1)",
      label: ext || "AUDIO",
    };
  if (
    mime.includes("presentation") ||
    mime.includes("powerpoint") ||
    ["PPTX", "PPT"].includes(ext)
  )
    return {
      icon: "fa-file-powerpoint",
      color: "#ea580c",
      bgColor: "rgba(234,88,12,0.1)",
      label: ext || "PPTX",
    };
  if (
    mime.includes("word") ||
    mime.includes("document") ||
    ["DOCX", "DOC"].includes(ext)
  )
    return {
      icon: "fa-file-word",
      color: "#2563eb",
      bgColor: "rgba(37,99,235,0.1)",
      label: ext || "DOC",
    };
  if (
    mime.includes("zip") ||
    mime.includes("archive") ||
    ["ZIP", "RAR", "7Z", "TAR", "GZ"].includes(ext)
  )
    return {
      icon: "fa-file-archive",
      color: "#ca8a04",
      bgColor: "rgba(202,138,4,0.1)",
      label: ext || "ZIP",
    };
  return {
    icon: "fa-file",
    color: "#6b7280",
    bgColor: "rgba(107,114,128,0.1)",
    label: ext || "FILE",
  };
};

/* simple tag extraction from note name â€“ if the name has words in brackets or common keywords */
const extractTags = (note) => {
  const tags = [];
  const name = String(note?.name || "").toLowerCase();
  if (
    name.includes("math") ||
    name.includes("algebra") ||
    name.includes("calculus")
  )
    tags.push("Mathematics");
  if (
    name.includes("science") ||
    name.includes("physics") ||
    name.includes("chemistry") ||
    name.includes("biology")
  )
    tags.push("Science");
  if (name.includes("history") || name.includes("war")) tags.push("History");
  if (name.includes("quiz") || name.includes("prep")) tags.push("Quiz-Prep");
  if (name.includes("exam")) tags.push("Exam");
  if (name.includes("project") || name.includes("brainstorm")) tags.push("CS");
  if (name.includes("review")) tags.push("Review");
  return tags;
};

const NotesPage = () => {
  const user = auth.currentUser;
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const { confirm } = useConfirm();
  const editorRef = useRef(null);
  const previewCloseTimerRef = useRef(null);

  const [driveStatus, setDriveStatus] = useState({ connected: false });
  const [driveFolderInput, setDriveFolderInput] = useState("");
  const [driveFolderStack, setDriveFolderStack] = useState([]);
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveUploading, setDriveUploading] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");
  const [showLeftPanelMenu, setShowLeftPanelMenu] = useState(false);
  const [showAccountMismatchModal, setShowAccountMismatchModal] =
    useState(false);
  const [pendingFolderId, setPendingFolderId] = useState("");

  const [search, setSearch] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [editorContent, setEditorContent] = useState("");
  const [editorLoadedId, setEditorLoadedId] = useState(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);

  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizData, setQuizData] = useState([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  const [previewFile, setPreviewFile] = useState(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 767px)").matches
      : false,
  );
  const [mobilePane, setMobilePane] = useState("list");
  const { isCollapsed: sidebarCollapsed, toggleCollapse: onToggleCollapse } =
    useSidebarCollapse();
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [attachmentSearch, setAttachmentSearch] = useState("");
  const [noteMenuOpen, setNoteMenuOpen] = useState(null);

  // Input modals state
  const [inputModal, setInputModal] = useState({
    show: false,
    type: "",
    title: "",
    value: "",
    placeholder: "",
    onConfirm: null,
  });
  const [inputValue, setInputValue] = useState("");
  const [moveModal, setMoveModal] = useState({
    show: false,
    itemId: "",
    itemName: "",
    itemType: "", // 'folder' or 'file'
  });
  const [siblingFolders, setSiblingFolders] = useState([]);

  const activeFolder = useMemo(
    () => driveFolderStack[driveFolderStack.length - 1] || null,
    [driveFolderStack],
  );
  const folders = useMemo(
    () =>
      driveFiles
        .filter((f) => f.mimeType === DRIVE_FOLDER_MIME)
        .sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""), undefined, {
            sensitivity: "base",
            numeric: true,
          }),
        ),
    [driveFiles],
  );
  const notes = useMemo(
    () => driveFiles.filter(isNoteFile).sort(byModifiedDesc),
    [driveFiles],
  );
  const attachments = useMemo(
    () =>
      driveFiles
        .filter((f) => f.mimeType !== DRIVE_FOLDER_MIME && !isNoteFile(f))
        .sort(byModifiedDesc),
    [driveFiles],
  );
  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? notes.filter((n) =>
          String(n.name || "")
            .toLowerCase()
            .includes(q),
        )
      : notes;
  }, [notes, search]);
  const filteredAttachments = useMemo(() => {
    const q = attachmentSearch.trim().toLowerCase();
    return q
      ? attachments.filter((f) =>
          String(f.name || "")
            .toLowerCase()
            .includes(q),
        )
      : attachments;
  }, [attachments, attachmentSearch]);
  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) || null,
    [notes, selectedNoteId],
  );
  const selectedText = !!selectedNote && isTextMime(selectedNote.mimeType);
  const selectedDoc = selectedNote?.mimeType === GOOGLE_DOC_MIME;

  const notify = (m) => {
    if (!m) return;
    setMessage(m);
    setTimeout(() => setMessage(""), 2500);
  };
  const clearPreviewState = () => {
    setPreviewFile(null);
  };
  const closePreview = () => {
    setPreviewFile(null);
  };
  const openPreview = (file) => {
    if (!file) return;
    setPreviewFile(file);
    if (isMobile) setMobilePane("detail");
  };
  const clearEditor = () => {
    setEditorContent("");
    setEditorLoadedId(null);
    setEditorDirty(false);
  };
  const confirmDiscard = async () => {
    if (!editorDirty) return true;
    return confirm({
      title: t("confirmActionTitle") || "Confirm action",
      message: t("unsavedChangesConfirm") || "Unsaved changes. Continue?",
      confirmText: t("continueAction") || "Continue",
      cancelText: t("keepEditing") || "Keep editing",
      variant: "default",
    });
  };

  const loadFiles = async (
    parentId = activeFolder?.id || driveStatus?.folderId,
  ) => {
    if (!parentId) return setDriveFiles([]);
    try {
      const payload = await driveService.listFiles({ pageSize: 100, parentId });
      setDriveFiles(Array.isArray(payload.files) ? payload.files : []);
    } catch (e) {
      notify(e?.message || t("driveLoadFailed"));
    }
  };

  const loadStatus = async () => {
    setDriveLoading(true);
    try {
      const s = await driveService.getStatus();
      setDriveStatus(s || { connected: false });
      if (s?.folderId) {
        setDriveFolderStack([{ id: s.folderId, name: s.folderName || "Root" }]);
        await loadFiles(s.folderId);
      } else {
        clearPreviewState();
        setDriveFolderStack([]);
        setDriveFiles([]);
        setSelectedNoteId(null);
        clearEditor();
      }
    } catch (e) {
      notify(e?.message || t("driveLoadFailed"));
    } finally {
      setDriveLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = (ev) => {
      setIsMobile(ev.matches);
      if (!ev.matches) setMobilePane("list");
    };
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (previewCloseTimerRef.current) {
        clearTimeout(previewCloseTimerRef.current);
      }
    };
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const menuWrappers = document.querySelectorAll(".notes-menu-wrapper");
      let clickedInside = false;
      menuWrappers.forEach((wrapper) => {
        if (wrapper.contains(event.target)) {
          clickedInside = true;
        }
      });
      if (!clickedInside) {
        setShowLeftPanelMenu(false);
        setNoteMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!notes.length) {
      setSelectedNoteId(null);
      clearEditor();
      return;
    }
    if (!selectedNoteId || !notes.some((n) => n.id === selectedNoteId)) {
      setSelectedNoteId(notes[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, selectedNoteId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedNote || !selectedText || editorLoadedId === selectedNote.id)
        return;
      setEditorLoading(true);
      try {
        const r = await driveService.getItemContent(selectedNote.id);
        if (cancelled) return;
        setEditorContent(r.content || "");
        setEditorLoadedId(selectedNote.id);
        setEditorDirty(false);
      } catch (e) {
        if (!cancelled) notify(e?.message || "Failed to load text.");
      } finally {
        if (!cancelled) setEditorLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNote?.id, selectedText, editorLoadedId]);

  const connect = async () => {
    if (!driveFolderInput.trim()) return notify(t("driveFolderRequired"));
    if (!(await confirmDiscard())) return;
    setDriveLoading(true);
    try {
      const c = await driveService.connectFolder(driveFolderInput.trim());
      setDriveStatus({
        connected: true,
        folderId: c.folderId,
        folderName: c.folderName,
        connectedEmail: c.connectedEmail,
      });
      setDriveFolderStack([{ id: c.folderId, name: c.folderName || "Root" }]);
      setDriveFolderInput("");
      clearEditor();
      await loadFiles(c.folderId);
      notify(t("driveConnected"));
    } catch (e) {
      const errorMessage = e?.message || "";
      // Check for Google account mismatch error
      if (
        errorMessage.includes("Google account must match app account email")
      ) {
        setPendingFolderId(driveFolderInput.trim());
        setShowAccountMismatchModal(true);
      } else {
        notify(errorMessage || t("driveConnectFailed"));
      }
    } finally {
      setDriveLoading(false);
    }
  };

  const handleReconnectWithCorrectAccount = async () => {
    // Force re-authentication with Google Drive
    try {
      setShowAccountMismatchModal(false);
      setDriveLoading(true);
      // Clear existing connection first
      await driveService.disconnect();
      // Try to connect again - this will trigger Google OAuth with account picker
      const c = await driveService.connectFolder(pendingFolderId, true);
      setDriveStatus({
        connected: true,
        folderId: c.folderId,
        folderName: c.folderName,
        connectedEmail: c.connectedEmail,
      });
      setDriveFolderStack([{ id: c.folderId, name: c.folderName || "Root" }]);
      setDriveFolderInput("");
      setPendingFolderId("");
      clearEditor();
      await loadFiles(c.folderId);
      notify(t("driveConnected"));
    } catch (e) {
      notify(e?.message || t("driveConnectFailed"));
      setPendingFolderId("");
    } finally {
      setDriveLoading(false);
    }
  };

  const disconnect = async () => {
    if (!(await confirmDiscard())) return;
    setDriveLoading(true);
    try {
      await driveService.disconnect();
      setDriveStatus({ connected: false });
      clearPreviewState();
      setDriveFolderStack([]);
      setDriveFiles([]);
      setSelectedNoteId(null);
      clearEditor();
      setMobilePane("list");
      notify(t("driveDisconnected"));
    } catch (e) {
      notify(e?.message || t("driveConnectFailed"));
    } finally {
      setDriveLoading(false);
    }
  };

  const openFolder = async (f) => {
    if (!(await confirmDiscard())) return;
    clearPreviewState();
    setDriveFolderStack([
      ...driveFolderStack,
      { id: f.id, name: f.name || f.id },
    ]);
    clearEditor();
    await loadFiles(f.id);
    setMobilePane("list");
  };
  const backFolder = async () => {
    if (driveFolderStack.length <= 1 || !(await confirmDiscard())) return;
    const next = driveFolderStack.slice(0, -1);
    clearPreviewState();
    setDriveFolderStack(next);
    clearEditor();
    await loadFiles(next[next.length - 1].id);
    setMobilePane("list");
  };

  // Helper functions for modals
  const openInputModal = (title, placeholder, defaultValue, onConfirm) => {
    setInputValue(defaultValue || "");
    setInputModal({ show: true, title, placeholder, onConfirm });
  };

  const closeInputModal = () => {
    setInputModal({
      show: false,
      type: "",
      title: "",
      value: "",
      placeholder: "",
      onConfirm: null,
    });
    setInputValue("");
  };

  const handleInputConfirm = () => {
    if (inputModal.onConfirm && inputValue.trim()) {
      inputModal.onConfirm(inputValue.trim());
    }
    closeInputModal();
  };

  const createFolder = async () => {
    openInputModal(
      t("driveNewFolderPrompt") || "New folder name",
      t("driveNewFolderPrompt") || "New folder name",
      "",
      async (name) => {
        setDriveLoading(true);
        try {
          await driveService.createFolder(name, {
            parentId: activeFolder?.id || driveStatus?.folderId,
          });
          await loadFiles();
          notify(t("driveFolderCreated"));
        } catch (e) {
          notify(e?.message || t("driveConnectFailed"));
        } finally {
          setDriveLoading(false);
        }
      },
    );
  };

  const createNote = async (type) => {
    const title =
      type === "doc"
        ? t("newDocNotePrompt") || "Google Doc name"
        : t("newTxtNotePrompt") || "TXT note name";
    const placeholder = type === "doc" ? "e.g. Math Notes" : "e.g. notes.txt";

    openInputModal(title, placeholder, "", async (name) => {
      setDriveLoading(true);
      try {
        const created = await driveService.createNoteFile(name, {
          type,
          content: "",
          parentId: activeFolder?.id || driveStatus?.folderId,
        });
        await loadFiles();
        if (created?.id) {
          setSelectedNoteId(created.id);
          setEditorLoadedId(null);
          if (isMobile) setMobilePane("detail");
        }
        notify(
          type === "doc"
            ? t("docCreated") || "Google Doc created."
            : t("noteSaved"),
        );
      } catch (e) {
        notify(e?.message || t("driveConnectFailed"));
      } finally {
        setDriveLoading(false);
      }
    });
  };

  const renameItem = async (f) => {
    openInputModal(
      t("driveRenamePrompt") || "Rename",
      t("driveRenamePrompt") || "Rename",
      f?.name || "",
      async (name) => {
        setWorkingId(f.id);
        try {
          await driveService.updateItem(f.id, { name });
          await loadFiles();
          notify(t("driveItemRenamed"));
        } catch (e) {
          notify(e?.message || t("driveConnectFailed"));
        } finally {
          setWorkingId("");
        }
      },
    );
  };

  const deleteItem = async (f) => {
    const accepted = await confirm({
      title: t("delete") || "Delete",
      message: f?.name
        ? `${t("driveDeleteConfirm") || "Delete this item?"} (${f.name})`
        : t("driveDeleteConfirm") || "Delete this item?",
      confirmText: t("delete") || "Delete",
      cancelText: t("cancel") || "Cancel",
      variant: "danger",
    });
    if (!accepted) return;

    setWorkingId(f.id);
    try {
      await driveService.deleteItem(f.id);
      if (selectedNoteId === f.id) {
        setSelectedNoteId(null);
        clearEditor();
      }
      if (previewFile?.id === f.id) clearPreviewState();
      await loadFiles();
      notify(t("driveItemDeleted"));
    } catch (e) {
      notify(e?.message || t("driveConnectFailed"));
    } finally {
      setWorkingId("");
    }
  };

  const loadSiblingFolders = async (parentId) => {
    try {
      const payload = await driveService.listFiles({ pageSize: 100, parentId });
      const allFolders = (Array.isArray(payload.files) ? payload.files : []).filter(
        (f) => f.mimeType === DRIVE_FOLDER_MIME
      );
      // Exclude current folder from siblings
      const currentFolderId = moveModal.itemId;
      const siblings = allFolders
        .filter((f) => f.id !== currentFolderId)
        .sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""), undefined, {
            sensitivity: "base",
            numeric: true,
          })
        );
      setSiblingFolders(siblings);
    } catch (e) {
      console.error("Failed to load sibling folders:", e);
      setSiblingFolders([]);
    }
  };

  const openMoveModal = async (f, type = "folder") => {
    setMoveModal({
      show: true,
      itemId: f.id,
      itemName: f.name || f.id,
      itemType: type,
    });
    // Load sibling folders (folders in the same parent)
    const parentFolderId = activeFolder?.id || driveStatus?.folderId;
    if (parentFolderId) {
      await loadSiblingFolders(parentFolderId);
    }
  };

  const closeMoveModal = () => {
    setMoveModal({ show: false, itemId: "", itemName: "", itemType: "" });
    setSiblingFolders([]);
  };

  const moveItemToFolder = async (targetFolderId) => {
    if (!moveModal.itemId) return;
    
    // Special case: targetFolderId === 'parent' means move to grandparent folder
    setWorkingId(moveModal.itemId);
    try {
      let destinationId;
      
      if (targetFolderId === 'parent') {
        // Move to parent folder (go up one level from current active folder)
        if (driveFolderStack.length < 2) {
          notify("Cannot move to parent - already at root level");
          closeMoveModal();
          setWorkingId("");
          return;
        }
        // Get parent folder (one level up from current)
        const parentIndex = driveFolderStack.length - 2;
        destinationId = driveFolderStack[parentIndex]?.id;
      } else if (targetFolderId === null || targetFolderId === undefined) {
        notify("Please select a destination folder");
        setWorkingId("");
        return;
      } else {
        destinationId = targetFolderId;
      }
      
      if (!destinationId) {
        notify("Invalid destination folder");
        closeMoveModal();
        setWorkingId("");
        return;
      }
      
      await driveService.updateItem(moveModal.itemId, {
        parentId: destinationId,
      });
      notify(t("driveItemMoved") || "Item moved successfully");
      closeMoveModal();
      await loadFiles();
    } catch (e) {
      notify(e?.message || t("driveMoveFailed") || "Failed to move item");
    } finally {
      setWorkingId("");
    }
  };

  const upload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setDriveUploading(true);
    try {
      await driveService.uploadFiles(files, {
        parentId: activeFolder?.id || driveStatus?.folderId,
      });
      await loadFiles();
      notify(t("uploadSuccess"));
    } catch (err) {
      notify(err?.message || t("driveUploadFailed"));
    } finally {
      setDriveUploading(false);
    }
  };

  // Open file directly in Google Drive (for mobile view)
  const openFileInDrive = (file) => {
    if (file?.webViewLink) {
      window.open(file.webViewLink, '_blank', 'noopener,noreferrer');
    } else if (file?.id) {
      // Fallback: construct Drive URL from file ID
      window.open(`https://drive.google.com/file/d/${file.id}/view`, '_blank', 'noopener,noreferrer');
    }
  };

  const selectNote = async (n) => {
    // On mobile, open file in Google Drive instead of in-app editor
    if (isMobile) {
      openFileInDrive(n);
      return;
    }
    if (n.id !== selectedNoteId && !(await confirmDiscard())) return;
    setSelectedNoteId(n.id);
    setEditorLoadedId(null);
  };

  const mutateEditor = (fn) => {
    if (!editorRef.current || !selectedText) return;
    const ta = editorRef.current;
    const s = ta.selectionStart || 0;
    const e = ta.selectionEnd || 0;
    const out = fn(editorContent, s, e);
    setEditorContent(out.text);
    setEditorDirty(true);
    requestAnimationFrame(() => ta.setSelectionRange(out.s, out.e));
  };
  const wrap = (a, b = a) =>
    mutateEditor((txt, s, e) => ({
      text: `${txt.slice(0, s)}${a}${txt.slice(s, e)}${b}${txt.slice(e)}`,
      s: s + a.length,
      e: e + a.length,
    }));
  const prefix = (p) =>
    mutateEditor((txt, s, e) => {
      const ls = txt.lastIndexOf("\n", Math.max(0, s - 1)) + 1;
      const le = txt.indexOf("\n", e);
      const end = le === -1 ? txt.length : le;
      const block = txt
        .slice(ls, end)
        .split("\n")
        .map((line) => (line.trim() ? `${p}${line}` : line))
        .join("\n");
      return {
        text: `${txt.slice(0, ls)}${block}${txt.slice(end)}`,
        s: ls,
        e: ls + block.length,
      };
    });

  const generateQuiz = async () => {
    if (!selectedNote || !selectedText || !editorContent.trim()) {
      notify("Please select a valid text note with content first.");
      return;
    }
    setIsGeneratingQuiz(true);
    try {
      const data = await quizService.generateQuiz(editorContent);
      setQuizData(data);
      setIsQuizModalOpen(true);
    } catch (error) {
      notify(error.message);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSaveQuizToNote = async (data, originalTitle) => {
    setDriveLoading(true);
    setIsQuizModalOpen(false);
    try {
      const markdownContent = `# Quiz based on: ${originalTitle}\n\n` + 
        data.map((item, i) => `### Q${i+1}: ${item.question}\n**Answer:** ${item.answer}\n\n---`).join('\n');
        
      const created = await driveService.createNoteFile(`${originalTitle} - Quiz.md`, {
        type: 'txt',
        content: markdownContent,
        parentId: activeFolder?.id || driveStatus?.folderId,
      });
      await loadFiles();
      if (created?.id) {
        setSelectedNoteId(created.id);
        setEditorLoadedId(null);
      }
      notify("Quiz saved as a new note successfully!");
    } catch (e) {
      notify(e?.message || "Failed to save quiz note.");
    } finally {
      setDriveLoading(false);
    }
  };

  const save = async () => {
    if (!selectedNote || !selectedText) return;
    setEditorSaving(true);
    try {
      await driveService.updateItemContent(selectedNote.id, editorContent);
      setEditorDirty(false);
      await loadFiles();
      notify(t("noteSaved"));
    } catch (e) {
      notify(e?.message || t("noteSaveFailed"));
    } finally {
      setEditorSaving(false);
    }
  };

  /* ============================
     LEFT PANEL â€“ Notes list
     ============================ */
  const leftPanel = (
    <section
      className={`notes-panel-left ${leftPanelCollapsed ? "collapsed" : ""} ${isDarkMode ? "dark" : ""}`}
    >
      {/* Header */}
      <div className="notes-panel-left-header">
        {!leftPanelCollapsed && (
          <h2
            className={`notes-panel-title ${isDarkMode ? "text-white" : "text-gray-900"}`}
          >
            {t("driveNotesTitle") || "Notes"}
          </h2>
        )}
        <div className="notes-panel-left-actions">
          {!leftPanelCollapsed && (
            <div
              className="notes-menu-wrapper"
              style={{ position: "relative", display: "inline-block" }}
            >
              <button
                onClick={() => setShowLeftPanelMenu(!showLeftPanelMenu)}
                className="notes-add-btn"
                title="New note"
                style={{
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              {showLeftPanelMenu && (
                <div
                  className={`notes-dropdown ${isDarkMode ? "dark" : ""}`}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    zIndex: 50,
                    minWidth: 180,
                  }}
                >
                  <button
                    onClick={() => {
                      createNote("txt");
                      setShowLeftPanelMenu(false);
                    }}
                  >
                    <i className="fas fa-file-alt"></i> New TXT Note
                  </button>
                  <button
                    onClick={() => {
                      createNote("doc");
                      setShowLeftPanelMenu(false);
                    }}
                  >
                    <i className="fas fa-file-word"></i> New Google Doc
                  </button>
                  <button
                    onClick={() => {
                      createFolder();
                      setShowLeftPanelMenu(false);
                    }}
                  >
                    <i className="fas fa-folder-plus"></i> New Folder
                  </button>
                </div>
              )}
            </div>
          )}
          {!isMobile && (
            <button
              onClick={() => setLeftPanelCollapsed((prev) => !prev)}
              className={`notes-collapse-btn ${isDarkMode ? "dark" : ""}`}
              title={
                leftPanelCollapsed ? "Expand notes list" : "Collapse notes list"
              }
            >
              <i
                className={`fas ${leftPanelCollapsed ? "fa-angle-right" : "fa-angle-left"}`}
              ></i>
            </button>
          )}
        </div>
      </div>

      {!leftPanelCollapsed ? (
        <>
          {/* Search */}
          <div className="notes-search-wrapper">
            <i
              className={`fas fa-search notes-search-icon ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
            ></i>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchNotes") || "Search your notes..."}
              className={`notes-search-input ${isDarkMode ? "dark" : ""}`}
            />
          </div>

          {/* Breadcrumb navigation */}
          {driveFolderStack.length > 0 && (
            <div
              className={`notes-breadcrumb ${isDarkMode ? "dark" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "8px 12px",
                fontSize: 13,
                flexWrap: "wrap",
              }}
            >
              {driveFolderStack.map((folder, index) => (
                <React.Fragment key={folder.id}>
                  {index > 0 && (
                    <span
                      className={isDarkMode ? "text-slate-500" : "text-gray-400"}
                      style={{ margin: "0 2px" }}
                    >
                      /
                    </span>
                  )}
                  {index === driveFolderStack.length - 1 ? (
                    // Current folder - not clickable
                    <span
                      className={`font-medium ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                      style={{
                        padding: "2px 8px",
                        borderRadius: 4,
                        backgroundColor: isDarkMode
                          ? "rgba(59, 130, 246, 0.1)"
                          : "rgba(59, 130, 246, 0.1)",
                      }}
                    >
                      <i
                        className="fas fa-folder-open"
                        style={{ marginRight: 4, fontSize: 11 }}
                      ></i>
                      {folder.name}
                    </span>
                  ) : (
                    // Parent folders - clickable to navigate back
                    <button
                      onClick={async () => {
                        if (!(await confirmDiscard())) return;
                        const newStack = driveFolderStack.slice(0, index + 1);
                        clearPreviewState();
                        setDriveFolderStack(newStack);
                        clearEditor();
                        await loadFiles(newStack[newStack.length - 1].id);
                        setMobilePane("list");
                      }}
                      className={`hover:underline ${isDarkMode ? "text-slate-300 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
                      style={{
                        padding: "2px 6px",
                        borderRadius: 4,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <i
                        className="fas fa-folder"
                        style={{ marginRight: 4, fontSize: 11 }}
                      ></i>
                      {folder.name}
                    </button>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Folders row */}
          {folders.length > 0 && (
            <div className="notes-folders-row">
              {driveFolderStack.length > 1 && (
                <button
                  onClick={backFolder}
                  className={`notes-folder-chip ${isDarkMode ? "dark" : ""}`}
                >
                  <i className="fas fa-arrow-left" style={{ fontSize: 10 }}></i>
                  Back
                </button>
              )}
              {folders.map((f) => {
                const isFolderMenuOpen = noteMenuOpen === `folder-${f.id}`;
                return (
                  <div
                    key={f.id}
                    className={`notes-folder-chip-wrapper ${isDarkMode ? "dark" : ""}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      position: "relative",
                    }}
                  >
                    <button
                      onClick={() => openFolder(f)}
                      className={`notes-folder-chip ${isDarkMode ? "dark" : ""}`}
                      style={{ borderRadius: "16px 0 0 16px" }}
                    >
                      <i
                        className="fas fa-folder"
                        style={{ fontSize: 10, color: "#f59e0b" }}
                      ></i>
                      {f.name}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNoteMenuOpen(isFolderMenuOpen ? null : `folder-${f.id}`);
                      }}
                      className={`notes-folder-menu-btn ${isDarkMode ? "dark" : ""}`}
                      style={{
                        padding: "4px 6px",
                        border: "none",
                        background: isFolderMenuOpen
                          ? isDarkMode
                            ? "rgba(255,255,255,0.15)"
                            : "rgba(0,0,0,0.1)"
                          : "transparent",
                        color: isDarkMode ? "#94a3b8" : "#64748b",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "0 6px 6px 0",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isFolderMenuOpen) {
                          e.currentTarget.style.background = isDarkMode
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.05)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isFolderMenuOpen) {
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      <i
                        className="fas fa-ellipsis-v"
                        style={{ fontSize: 10 }}
                      ></i>
                    </button>
                    {isFolderMenuOpen && (
                      <>
                        <div
                          style={{
                            position: "fixed",
                            inset: 0,
                            zIndex: 40,
                            background: "transparent",
                          }}
                          onClick={() => setNoteMenuOpen(null)}
                        ></div>
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            top: "100%",
                            marginTop: 4,
                            zIndex: 50,
                            minWidth: 140,
                            borderRadius: 8,
                            border: isDarkMode
                              ? "1px solid rgba(255,255,255,0.1)"
                              : "1px solid rgba(0,0,0,0.1)",
                            background: isDarkMode ? "var(--sf-surface)" : "#ffffff",
                            boxShadow: isDarkMode
                              ? "0 10px 40px rgba(0,0,0,0.4)"
                              : "0 10px 40px rgba(0,0,0,0.15)",
                            overflow: "hidden",
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              renameItem(f);
                              setNoteMenuOpen(null);
                            }}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "none",
                              background: "transparent",
                              color: isDarkMode ? "#e2e8f0" : "#334155",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: 13,
                              textAlign: "left",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = isDarkMode
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.05)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <i
                              className="fas fa-pen"
                              style={{ fontSize: 12, width: 14 }}
                            ></i>
                            Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openMoveModal(f, "folder");
                              setNoteMenuOpen(null);
                            }}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "none",
                              background: "transparent",
                              color: isDarkMode ? "#e2e8f0" : "#334155",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: 13,
                              textAlign: "left",
                              borderTop: isDarkMode
                                ? "1px solid rgba(255,255,255,0.1)"
                                : "1px solid rgba(0,0,0,0.05)",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = isDarkMode
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.05)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <i
                              className="fas fa-folder-open"
                              style={{ fontSize: 12, width: 14 }}
                            ></i>
                            Move to
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteItem(f);
                              setNoteMenuOpen(null);
                            }}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "none",
                              background: "transparent",
                              color: "#ef4444",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: 13,
                              textAlign: "left",
                              borderTop: isDarkMode
                                ? "1px solid rgba(255,255,255,0.1)"
                                : "1px solid rgba(0,0,0,0.05)",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = isDarkMode
                                ? "rgba(239,68,68,0.2)"
                                : "rgba(239,68,68,0.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <i
                              className="fas fa-trash"
                              style={{ fontSize: 12, width: 14 }}
                            ></i>
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Notes list */}
          <div className="notes-list-scroll">
            {filteredNotes.map((n) => {
              const isActive = n.id === selectedNoteId;
              const tags = extractTags(n);
              const isMenuOpen = noteMenuOpen === n.id;
              return (
                <div
                  key={n.id}
                  className={`notes-card ${isActive ? "active" : ""} ${isDarkMode ? "dark" : ""}`}
                  style={{ position: "relative" }}
                >
                  {/* Main content area - clickable to select note */}
                  <div
                    style={{ cursor: "pointer", paddingRight: 32 }}
                    onClick={() => selectNote(n)}
                  >
                    <div
                      className="notes-card-header"
                      style={{ marginBottom: 8 }}
                    >
                      <p
                        className={`notes-card-title ${isDarkMode ? "text-white" : "text-gray-900"}`}
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        {n.name?.replace(/\.(txt|md|csv|log)$/i, "") ||
                          "Untitled"}
                      </p>
                    </div>
                    <p
                      className={`notes-card-preview ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
                      style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}
                    >
                      {n.mimeType === GOOGLE_DOC_MIME
                        ? "Google Doc - click to preview"
                        : "Click to view and edit this note..."}
                    </p>
                    {tags.length > 0 && (
                      <div
                        className="notes-card-tags"
                        style={{ marginBottom: 8 }}
                      >
                        {tags.map((tag) => (
                          <span key={tag} className="notes-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer with time and menu */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: 8,
                      borderTop: isDarkMode
                        ? "1px solid rgba(255,255,255,0.05)"
                        : "1px solid rgba(0,0,0,0.05)",
                    }}
                  >
                    <span
                      className={`notes-card-date ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                      style={{ fontSize: 11, fontWeight: 500 }}
                    >
                      {formatRelativeDate(n.modifiedTime)}
                    </span>

                    {/* Three dots menu */}
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNoteMenuOpen(isMenuOpen ? null : n.id);
                        }}
                        className={`notes-action-btn ${isDarkMode ? "dark" : ""}`}
                        title="More options"
                        style={{
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "none",
                          background: isMenuOpen
                            ? isDarkMode
                              ? "rgba(255,255,255,0.15)"
                              : "rgba(0,0,0,0.1)"
                            : "transparent",
                          color: isDarkMode ? "#94a3b8" : "#64748b",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isMenuOpen) {
                            e.currentTarget.style.background = isDarkMode
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.05)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isMenuOpen) {
                            e.currentTarget.style.background = "transparent";
                          }
                        }}
                      >
                        <i
                          className="fas fa-ellipsis-v"
                          style={{ fontSize: 12 }}
                        ></i>
                      </button>

                      {/* Dropdown menu */}
                      {isMenuOpen && (
                        <>
                          <div
                            style={{
                              position: "fixed",
                              inset: 0,
                              zIndex: 40,
                              background: "transparent",
                            }}
                            onClick={() => setNoteMenuOpen(null)}
                          ></div>
                          <div
                            style={{
                              position: "absolute",
                              right: 0,
                              bottom: "100%",
                              marginBottom: 4,
                              zIndex: 50,
                              minWidth: 140,
                              borderRadius: 8,
                              border: isDarkMode
                                ? "1px solid rgba(255,255,255,0.1)"
                                : "1px solid rgba(0,0,0,0.1)",
          background: isDarkMode ? "var(--sf-surface)" : "#ffffff",
                              boxShadow: isDarkMode
                                ? "0 10px 40px rgba(0,0,0,0.4)"
                                : "0 10px 40px rgba(0,0,0,0.15)",
                              overflow: "hidden",
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                renameItem(n);
                                setNoteMenuOpen(null);
                              }}
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: "none",
                                background: "transparent",
                                color: isDarkMode ? "#e2e8f0" : "#334155",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 13,
                                textAlign: "left",
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = isDarkMode
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.05)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                  "transparent";
                              }}
                            >
                              <i
                                className="fas fa-pen"
                                style={{ fontSize: 12, width: 14 }}
                              ></i>
                              Rename
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openMoveModal(n, "file");
                                setNoteMenuOpen(null);
                              }}
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: "none",
                                background: "transparent",
                                color: isDarkMode ? "#e2e8f0" : "#334155",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 13,
                                textAlign: "left",
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = isDarkMode
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.05)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                  "transparent";
                              }}
                            >
                              <i
                                className="fas fa-folder-open"
                                style={{ fontSize: 12, width: 14 }}
                              ></i>
                              Move to
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteItem(n);
                                setNoteMenuOpen(null);
                              }}
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: "none",
                                background: "transparent",
                                color: "#ef4444",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 13,
                                textAlign: "left",
                                borderTop: isDarkMode
                                  ? "1px solid rgba(255,255,255,0.1)"
                                  : "1px solid rgba(0,0,0,0.05)",
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = isDarkMode
                                  ? "rgba(239,68,68,0.2)"
                                  : "rgba(239,68,68,0.1)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                  "transparent";
                              }}
                            >
                              <i
                                className="fas fa-trash"
                                style={{ fontSize: 12, width: 14 }}
                              ></i>
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredNotes.length === 0 && (
              <p
                className={`text-sm px-4 py-6 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
              >
                {t("driveNoNotes") || t("noNotesYet") || "No notes yet"}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="notes-panel-left-collapsed-body">
          <i className="fas fa-sticky-note"></i>
          <span>{filteredNotes.length}</span>
        </div>
      )}
    </section>
  );

  /* ============================
     CENTER PANEL - Editor
     ============================ */
  const centerPanel = (
    <section className={`notes-panel-center ${isDarkMode ? "dark" : ""}`}>
      {/* Top status bar */}
      <div className={`notes-statusbar ${isDarkMode ? "dark" : ""}`}>
        <div className="notes-statusbar-left">
          {driveStatus?.connected && (
            <>
              <span className="notes-statusbar-sync">
                <i className="fas fa-cloud" style={{ color: "#22c55e" }}></i>
                <span>{t("onlineStatus") || "Saved to Cloud"}</span>
              </span>
              <span className="notes-statusbar-dot" aria-hidden="true"></span>
              <span className={isDarkMode ? "text-slate-400" : "text-gray-500"}>
                {selectedNote?.modifiedTime
                  ? `Last edited ${formatRelativeDate(selectedNote.modifiedTime)}`
                  : "\u2014"}
              </span>
            </>
          )}
        </div>
        <div className="notes-statusbar-right">
          {activeFolder && (
            <span className={`notes-folder-badge ${isDarkMode ? "dark" : ""}`}>
              <span className="notes-folder-badge-dot"></span>
              Folder: {activeFolder.name}
              <button
                onClick={() => loadFiles()}
                title="Refresh"
                style={{ marginLeft: 4, opacity: 0.6 }}
              >
                <i className="fas fa-sync-alt" style={{ fontSize: 10 }}></i>
              </button>
            </span>
          )}
          <button
            onClick={() =>
              selectedNote?.webViewLink &&
              window.open(
                selectedNote.webViewLink,
                "_blank",
                "noopener,noreferrer",
              )
            }
            className="notes-share-btn"
          >
            {t("openInDrive") || "Share"}
          </button>
          {driveStatus?.connected && (
            <button
              onClick={disconnect}
              className="notes-share-btn"
              style={{
                color: "#dc2626",
                borderColor: "#dc2626",
                backgroundColor: isDarkMode
                  ? "rgba(220,38,38,0.1)"
                  : "rgba(220,38,38,0.05)",
              }}
              title="Disconnect Google Drive"
            >
              <i className="fas fa-unlink" style={{ marginRight: 6 }}></i>
              {isMobile ? "" : "Disconnect"}
            </button>
          )}
        </div>
      </div>

      {/* Account Mismatch Modal */}
      {showAccountMismatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-2xl p-6 w-full max-w-md shadow-2xl border ${
              isDarkMode
                ? "sf-dark-card sf-dark-border"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-amber-600 text-xl"></i>
              </div>
              <div>
                <h3
                  className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  Account Mismatch
                </h3>
                <p
                  className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
                >
                  Google Drive Account Error
                </p>
              </div>
            </div>

            <div
              className={`p-4 rounded-xl mb-4 ${isDarkMode ? "bg-slate-800" : "bg-gray-50"}`}
            >
              <p
                className={`text-sm mb-2 ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}
              >
                <i className="fas fa-info-circle mr-2 text-blue-500"></i>
                The Google account currently signed in does not match the app
                account email.
              </p>
              <p
                className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
              >
                You need to sign in with the correct Google account that matches
                your app email:
              </p>
              <p
                className={`text-sm font-semibold mt-2 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
              >
                {user?.email}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAccountMismatchModal(false);
                  setPendingFolderId("");
                }}
                disabled={driveLoading}
                className={`flex-1 px-4 py-2.5 rounded-xl border font-medium transition-colors ${
                  isDarkMode
                    ? "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"
                    : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleReconnectWithCorrectAccount}
                disabled={driveLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {driveLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sync-alt"></i>
                    Switch Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Folder Modal */}
      {moveModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-2xl p-6 w-full max-w-md shadow-2xl border ${
              isDarkMode
                ? "sf-dark-card sf-dark-border"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <i className="fas fa-folder-open text-blue-600 text-xl"></i>
              </div>
              <div>
                <h3
                  className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  Move to Folder
                </h3>
                <p
                  className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
                >
                  Select a destination folder
                </p>
              </div>
            </div>

            <div
              className={`p-3 rounded-xl mb-4 ${isDarkMode ? "bg-slate-800" : "bg-gray-50"}`}
            >
              <p
                className={`text-sm ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}
              >
                Moving:{" "}
                <span
                  className={`font-semibold ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                >
                  {moveModal.itemName}
                </span>
              </p>
            </div>

            <div className="mb-4">
              <p
                className={`text-xs font-medium mb-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
              >
                Select destination folder:
              </p>
              <div
                className="max-h-48 overflow-y-auto space-y-1"
                style={{ maxHeight: "12rem" }}
              >
                {siblingFolders.length === 0 ? (
                  <p
                    className={`text-sm py-3 text-center ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                  >
                    <i className="fas fa-folder-slash mr-2"></i>
                    No other folders available
                  </p>
                ) : (
                  siblingFolders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => moveItemToFolder(folder.id)}
                      disabled={workingId === moveModal.itemId}
                      className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                        isDarkMode
                          ? "hover:bg-slate-700 text-slate-200"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      <i
                        className="fas fa-folder"
                        style={{ fontSize: 16, color: "#f59e0b" }}
                      ></i>
                      <span className="flex-1 text-left text-sm font-medium">
                        {folder.name}
                      </span>
                      {workingId === moveModal.itemId && (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={closeMoveModal}
                disabled={workingId === moveModal.itemId}
                className={`flex-1 px-4 py-2.5 rounded-xl border font-medium transition-colors ${
                  isDarkMode
                    ? "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"
                    : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => moveItemToFolder('parent')}
                disabled={workingId === moveModal.itemId || driveFolderStack.length < 2}
                className={`flex-1 px-4 py-2.5 rounded-xl border font-medium transition-colors ${
                  isDarkMode
                    ? "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600 disabled:opacity-50"
                    : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 disabled:opacity-50"
                }`}
                title="Move to parent folder"
              >
                <i className="fas fa-level-up-alt mr-2"></i>
                Move to Parent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor content */}
      <div className="notes-editor-area">
        {!driveStatus?.connected ? (
          /* Connect Drive prompt */
          <div className="notes-connect-prompt">
            <div style={{ textAlign: "center", maxWidth: 400 }}>
              <i
                className="fas fa-cloud"
                style={{ fontSize: 48, color: "#3b82f6", marginBottom: 16 }}
              ></i>
              <h2
                className={`text-2xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                {t("connectDrive") || "Connect Google Drive"}
              </h2>
              <p
                className={`text-sm mb-4 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
              >
                Enter a Google Drive folder ID to sync your notes
              </p>
              <div className="flex gap-2">
                <input
                  value={driveFolderInput}
                  onChange={(e) => setDriveFolderInput(e.target.value)}
                  placeholder={
                    t("driveFolderPlaceholder") || "Enter Folder ID..."
                  }
                  className={`notes-search-input flex-1 ${isDarkMode ? "dark" : ""}`}
                  style={{ borderRadius: 10 }}
                />
                <button
                  onClick={connect}
                  disabled={driveLoading}
                  className="notes-share-btn"
                  style={{ padding: "8px 20px" }}
                >
                  {driveLoading ? "..." : t("connectDrive") || "Connect"}
                </button>
              </div>
            </div>
          </div>
        ) : !selectedNote ? (
          <div className="notes-connect-prompt">
            <div style={{ textAlign: "center" }}>
              <i
                className="fas fa-sticky-note"
                style={{ fontSize: 48, color: "#94a3b8", marginBottom: 16 }}
              ></i>
              <p
                className={`text-lg ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}
              >
                {t("noteEditorEmpty") || "Select a note from the left panel"}
              </p>
            </div>
          </div>
        ) : selectedDoc ? (
          <div className="notes-doc-view">
            <h1
              className={`notes-editor-title ${isDarkMode ? "text-white" : "text-gray-900"}`}
            >
              {selectedNote.name}
            </h1>
            <iframe
              title={selectedNote.name || "Google Doc"}
              src={`https://docs.google.com/document/d/${selectedNote.id}/edit?embedded=true`}
              className="notes-doc-iframe"
            />
          </div>
        ) : (
          <div className="notes-text-editor">
            <h1
              className={`notes-editor-title ${isDarkMode ? "text-white" : "text-gray-900"}`}
            >
              {selectedNote.name?.replace(/\.(txt|md|csv|log)$/i, "") ||
                "Untitled"}
            </h1>

            {/* Formatting toolbar */}
            <div className={`notes-toolbar ${isDarkMode ? "dark" : ""}`}>
              <button
                onClick={() => wrap("**")}
                className={`notes-toolbar-btn ${isDarkMode ? "dark" : ""}`}
                title="Bold"
              >
                <b>B</b>
              </button>
              <button
                onClick={() => wrap("*")}
                className={`notes-toolbar-btn ${isDarkMode ? "dark" : ""}`}
                title="Italic"
              >
                <i style={{ fontStyle: "italic" }}>I</i>
              </button>
              <button
                onClick={() => wrap("<u>", "</u>")}
                className={`notes-toolbar-btn ${isDarkMode ? "dark" : ""}`}
                title="Underline"
              >
                <span style={{ textDecoration: "underline" }}>U</span>
              </button>
              <div className="notes-toolbar-divider"></div>
              <button
                onClick={() => prefix("- ")}
                className={`notes-toolbar-btn ${isDarkMode ? "dark" : ""}`}
                title="Bullet list"
              >
                <i className="fas fa-list-ul"></i>
              </button>
              <button
                onClick={() => prefix("1. ")}
                className={`notes-toolbar-btn ${isDarkMode ? "dark" : ""}`}
                title="Numbered list"
              >
                <i className="fas fa-list-ol"></i>
              </button>
              <button
                onClick={() => prefix("> ")}
                className={`notes-toolbar-btn ${isDarkMode ? "dark" : ""}`}
                title="Blockquote"
              >
                <i className="fas fa-quote-right"></i>
              </button>

              <div className="notes-toolbar-divider"></div>
              <button
                onClick={generateQuiz}
                disabled={isGeneratingQuiz || editorLoading}
                className={`notes-toolbar-btn font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 ${isDarkMode ? "dark" : ""}`}
                title="Generate AI Quiz"
                style={{ width: 'auto', padding: '0 10px', gap: '6px' }}
              >
                {isGeneratingQuiz ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>}
                <span className="text-xs">AI Quiz</span>
              </button>

              <div className="ml-auto flex items-center gap-2">
                {editorDirty && (
                  <span className="text-xs text-amber-500 font-medium">
                    Unsaved
                  </span>
                )}
                <button
                  onClick={save}
                  disabled={editorLoading || editorSaving || !editorDirty}
                  className="notes-save-btn"
                >
                  {editorSaving ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i> {t("save") || "Save"}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Textarea */}
            {editorLoading ? (
              <div className="notes-connect-prompt" style={{ minHeight: 300 }}>
                <i className="fas fa-spinner fa-spin text-2xl text-blue-500"></i>
              </div>
            ) : (
              <textarea
                ref={editorRef}
                value={editorContent}
                onChange={(e) => {
                  setEditorContent(e.target.value);
                  setEditorDirty(true);
                }}
                className={`notes-textarea ${isDarkMode ? "dark" : ""}`}
                placeholder={
                  t("noteContentPlaceholder") ||
                  "Start writing your notes here..."
                }
              />
            )}
          </div>
        )}
      </div>

      {/* Toast message */}
      {message && (
        <div className="notes-toast">
          <i className="fas fa-check-circle"></i> {message}
        </div>
      )}
    </section>
  );

  /* ============================
     RIGHT PANEL â€“ Attachments
     ============================ */
  const rightPanel = (
    <section
      className={`notes-panel-right ${previewFile ? "preview-mode" : ""} ${isDarkMode ? "dark" : ""}`}
    >
      {/* Header */}
      <div className="notes-panel-right-header">
        <p
          className={`notes-attachments-title ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
        >
          {t("attachments") || "ATTACHMENTS"}
        </p>
        <label className="notes-add-btn small" title="Upload file">
          <i
            className={`fas ${driveUploading ? "fa-spinner fa-spin" : "fa-plus"}`}
            style={{ fontSize: 11 }}
          ></i>
          <input
            type="file"
            multiple
            hidden
            onChange={upload}
            disabled={!driveStatus?.connected || driveUploading}
          />
        </label>
      </div>
      {!previewFile && (
        <div className="notes-attachments-search">
          <i
            className={`fas fa-search notes-search-icon ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
          ></i>
          <input
            value={attachmentSearch}
            onChange={(e) => setAttachmentSearch(e.target.value)}
            placeholder={t("searchAttachments") || "Search attachments..."}
            className={`notes-search-input ${isDarkMode ? "dark" : ""}`}
          />
        </div>
      )}

      {/* Inline Preview (if a file is being previewed) */}
      {previewFile && (
        <div className="notes-inline-preview-section">
          <div
            className={`notes-inline-preview-header ${isDarkMode ? "dark" : ""}`}
          >
            <div
              className="notes-attachment-icon"
              style={{
                backgroundColor: getFileTypeInfo(previewFile).bgColor,
                color: getFileTypeInfo(previewFile).color,
                width: 30,
                height: 30,
                fontSize: 13,
                borderRadius: 8,
              }}
            >
              <i className={`fas ${getFileTypeInfo(previewFile).icon}`}></i>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                className={`notes-attachment-name ${isDarkMode ? "text-white" : "text-gray-900"}`}
                style={{ fontSize: "0.78rem" }}
              >
                {previewFile.name}
              </p>
            </div>
            <button
              onClick={closePreview}
              className={`notes-attachment-action-btn ${isDarkMode ? "dark" : ""}`}
              style={{ width: 24, height: 24 }}
              title="Close preview"
            >
              <i className="fas fa-times" style={{ fontSize: 10 }}></i>
            </button>
          </div>
          <iframe
            title={previewFile.name || "Preview"}
            src={`https://drive.google.com/file/d/${previewFile.id}/preview`}
            className="notes-inline-preview-iframe"
            allow="autoplay"
          />
          <div className="notes-inline-preview-actions">
            <button
              onClick={() =>
                previewFile.webViewLink &&
                window.open(
                  previewFile.webViewLink,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              className="notes-share-btn"
              style={{ fontSize: "0.7rem", padding: "4px 10px", flex: 1 }}
            >
              <i
                className="fas fa-external-link-alt"
                style={{ fontSize: 9 }}
              ></i>{" "}
              {t("openInDrive") || "Open in Drive"}
            </button>
          </div>
        </div>
      )}

      {/* Attachment list */}
      {!previewFile && (
        <div className="notes-attachments-scroll">
          {filteredAttachments.map((f) => {
            const ft = getFileTypeInfo(f);
            const size = Number.parseInt(f.size || "0", 10) || 0;
            const isBeingPreviewed = previewFile?.id === f.id;
            return (
              <div
                key={f.id}
                className={`notes-attachment-card ${isBeingPreviewed ? "active" : ""} ${isDarkMode ? "dark" : ""}`}
                onClick={() =>
                  isBeingPreviewed ? closePreview() : openPreview(f)
                }
                role="button"
                tabIndex={0}
              >
                <div
                  className="notes-attachment-icon"
                  style={{ backgroundColor: ft.bgColor, color: ft.color }}
                >
                  <i className={`fas ${ft.icon}`}></i>
                </div>
                <div className="notes-attachment-info">
                  <p
                    className={`notes-attachment-name ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {f.name}
                  </p>
                  <p
                    className={`notes-attachment-meta ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                  >
                    {formatSize(size)} - {ft.label}
                  </p>
                </div>
                <div className="notes-attachment-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      renameItem(f);
                    }}
                    disabled={workingId === f.id}
                    title="Rename"
                    className={`notes-attachment-action-btn ${isDarkMode ? "dark" : ""}`}
                  >
                    <i className="fas fa-pen"></i>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteItem(f);
                    }}
                    disabled={workingId === f.id}
                    title="Delete"
                    className="notes-attachment-action-btn danger"
                  >
                    <i
                      className={`fas ${workingId === f.id ? "fa-spinner fa-spin" : "fa-trash"}`}
                    ></i>
                  </button>
                </div>
              </div>
            );
          })}
          {attachments.length === 0 && (
            <p
              className={`text-sm px-3 py-4 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
            >
              {t("attachmentsEmpty") ||
                t("driveFilesEmpty") ||
                "No attachments"}
            </p>
          )}
          {attachments.length > 0 && filteredAttachments.length === 0 && (
            <p
              className={`text-sm px-3 py-4 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
            >
              {t("noAttachmentResults") || "No attachments match your search"}
            </p>
          )}
        </div>
      )}
    </section>
  );

  /* ============================
     MAIN LAYOUT
     ============================ */
  return (
    <div
      className={`flex h-screen w-full overflow-hidden ${isDarkMode ? "sf-dark-shell" : "bg-[#f8fafc]"}`}
    >
      <Sidebar
        user={user}
        collapsed={sidebarCollapsed}
        onToggleCollapse={onToggleCollapse}
      />
      <main
        className="flex-1 flex flex-col h-full overflow-hidden pb-20 md:pb-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <div className="flex-1 min-h-0 w-full px-3 py-3 md:px-4 md:py-4 flex flex-col gap-3">
          {isMobile ? (
            mobilePane === "list" ? (
              <div className="min-h-0 flex-1">{leftPanel}</div>
            ) : (
              <div className="min-h-0 flex-1 flex flex-col gap-3">
                <button
                  onClick={() => setMobilePane("list")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-white text-gray-600 border border-gray-200"}`}
                >
                  <i className="fas fa-arrow-left"></i>{" "}
                  {t("backToList") || "Back to Notes"}
                </button>
                <div className="min-h-[280px]">{centerPanel}</div>
                <div className="min-h-[240px]">{rightPanel}</div>
              </div>
            )
          ) : (
            <div
              className={`notes-layout-grid ${leftPanelCollapsed ? "left-collapsed" : ""}`}
            >
              {leftPanel}
              {centerPanel}
              {rightPanel}
            </div>
          )}
        </div>
      </main>

      {/* Input Modal */}
      {inputModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
              isDarkMode
                ? "sf-dark-card sf-dark-border"
                : "bg-white border-gray-200"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between px-5 py-4 border-b ${
                isDarkMode ? "border-slate-700" : "border-gray-100"
              }`}
            >
              <h3
                className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                {inputModal.title}
              </h3>
              <button
                onClick={closeInputModal}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isDarkMode
                    ? "hover:bg-slate-700 text-slate-400"
                    : "hover:bg-gray-100 text-gray-400"
                }`}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={inputModal.placeholder}
                className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? "bg-slate-800 border-slate-600 text-white placeholder-slate-400"
                    : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"
                }`}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInputConfirm();
                  if (e.key === "Escape") closeInputModal();
                }}
              />
            </div>

            {/* Footer */}
            <div
              className={`flex gap-3 px-5 py-4 border-t ${
                isDarkMode ? "border-slate-700" : "border-gray-100"
              }`}
            >
              <button
                onClick={closeInputModal}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isDarkMode
                    ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                onClick={handleInputConfirm}
                disabled={!inputValue.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <i className="fas fa-check"></i>
                {t("save") || "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <QuizModal 
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        quizData={quizData}
        isDarkMode={isDarkMode}
        onSaveToNote={handleSaveQuizToNote}
        noteTitle={selectedNote?.name?.replace(/\.(txt|md|csv|log)$/i, "") || "Untitled"}
      />
    </div>
  );
};

export default NotesPage;
