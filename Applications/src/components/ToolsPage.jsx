import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { auth } from "../firebase-config";
import { useDarkMode } from "../contexts/DarkModeContext";
import { useLang } from "../contexts/LanguageContext";
import { useConfirm } from "../contexts/ConfirmDialogContext";
import { studyToolsService } from "../services/firestore-service";
import {
  DEFAULT_STUDY_TOOLS,
  decorateStudyTool,
  sortStudyTools,
} from "../config/study-tools";
import Sidebar from "./Sidebar";

const TOOL_LOAD_TIMEOUT = 10000;

const EMPTY_FORM = {
  id: null,
  name: "",
  description: "",
  launchUrl: "",
  embedUrl: "",
  canEmbed: false,
  createdAt: null,
};

const normalizeHttpUrl = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
};

const buildFormState = (tool) => ({
  id: tool?.id || null,
  name: tool?.name || "",
  description: tool?.description || "",
  launchUrl: tool?.launchUrl || "",
  embedUrl: tool?.embedUrl || "",
  canEmbed: Boolean(tool?.canEmbed),
  createdAt: tool?.createdAt || null,
});

const ToolLogo = ({ tool, className = "", imgClassName = "" }) => {
  const [failedSrc, setFailedSrc] = useState("");
  const shouldShowImage = Boolean(tool?.logoUrl) && failedSrc !== tool.logoUrl;

  return (
    <div className={className}>
      {shouldShowImage ? (
        <img
          src={tool.logoUrl}
          alt=""
          className={imgClassName}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(tool.logoUrl)}
        />
      ) : (
        <i className={`fas ${tool.icon}`}></i>
      )}
    </div>
  );
};

const ToolsPage = () => {
  const user = auth.currentUser;
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const { confirm } = useConfirm();
  const [customTools, setCustomTools] = useState([]);
  const [activeToolId, setActiveToolId] = useState(null);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [mobileShowPanel, setMobileShowPanel] = useState(false);
  const [isLoadingCustomTools, setIsLoadingCustomTools] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [modalMode, setModalMode] = useState("add");
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [toolForm, setToolForm] = useState(EMPTY_FORM);
  const [toolFormError, setToolFormError] = useState("");
  const [isSavingTool, setIsSavingTool] = useState(false);
  const [iframeInstanceKey, setIframeInstanceKey] = useState(0);
  const iframeRef = useRef(null);
  const loadTimeoutRef = useRef(null);

  useEffect(() => {
    const unsubscribe = studyToolsService.subscribeToStudyTools((items) => {
      setCustomTools(items);
      setIsLoadingCustomTools(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!feedback) return undefined;
    const timeout = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(
    () => () => {
      if (loadTimeoutRef.current) window.clearTimeout(loadTimeoutRef.current);
    },
    [],
  );

  const decoratedCustomTools = useMemo(
    () =>
      sortStudyTools(
        customTools.map((tool, index) =>
          decorateStudyTool(tool, index + DEFAULT_STUDY_TOOLS.length),
        ),
      ),
    [customTools],
  );

  const embeddedTools = useMemo(
    () => [
      ...DEFAULT_STUDY_TOOLS.filter((tool) => tool.category === "embedded"),
      ...decoratedCustomTools.filter((tool) => tool.category === "embedded"),
    ],
    [decoratedCustomTools],
  );

  const externalTools = useMemo(
    () => [
      ...DEFAULT_STUDY_TOOLS.filter((tool) => tool.category === "external"),
      ...decoratedCustomTools.filter((tool) => tool.category === "external"),
    ],
    [decoratedCustomTools],
  );

  const allTools = useMemo(
    () => [...embeddedTools, ...externalTools],
    [embeddedTools, externalTools],
  );

  const activeTool = useMemo(
    () => allTools.find((tool) => tool.id === activeToolId) || null,
    [allTools, activeToolId],
  );

  const resolveToolName = useCallback(
    (tool) => (tool?.nameKey ? t(tool.nameKey) : tool?.name || t("untitledLink")),
    [t],
  );

  const resolveToolDescription = useCallback(
    (tool) => (tool?.descKey ? t(tool.descKey) : tool?.description || ""),
    [t],
  );

  const clearIframeTimeout = useCallback(() => {
    if (loadTimeoutRef.current) {
      window.clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  const beginToolLoad = useCallback(
    (tool) => {
      clearIframeTimeout();

      if (!tool?.canEmbed) {
        setIframeLoading(false);
        setIframeError(Boolean(tool));
        setIframeInstanceKey((value) => value + 1);
        return;
      }

      setIframeLoading(true);
      setIframeError(false);
      setIframeInstanceKey((value) => value + 1);
      loadTimeoutRef.current = window.setTimeout(() => {
        setIframeLoading(false);
        setIframeError(true);
      }, TOOL_LOAD_TIMEOUT);
    },
    [clearIframeTimeout],
  );

  const handleSelectTool = useCallback(
    (tool) => {
      setActiveToolId(tool.id);
      setMobileShowPanel(true);
      beginToolLoad(tool);
    },
    [beginToolLoad],
  );

  const handleIframeLoad = useCallback(() => {
    clearIframeTimeout();
    setIframeLoading(false);
    setIframeError(false);
  }, [clearIframeTimeout]);

  const handleIframeError = useCallback(() => {
    clearIframeTimeout();
    setIframeLoading(false);
    setIframeError(true);
  }, [clearIframeTimeout]);

  const handleOpenNewTab = useCallback(
    (tool) => {
      const targetTool = tool || activeTool;
      if (!targetTool) return;
      window.open(targetTool.launchUrl, "_blank", "noopener,noreferrer");
    },
    [activeTool],
  );

  const handleRefreshIframe = useCallback(() => {
    if (!activeTool?.canEmbed) return;
    beginToolLoad(activeTool);
  }, [activeTool, beginToolLoad]);

  const handleBackToList = useCallback(() => {
    clearIframeTimeout();
    setMobileShowPanel(false);
    setActiveToolId(null);
    setIframeError(false);
    setIframeLoading(false);
  }, [clearIframeTimeout]);

  useEffect(() => {
    if (activeToolId && !activeTool) {
      handleBackToList();
    }
  }, [activeTool, activeToolId, handleBackToList]);

  const openAddModal = useCallback(() => {
    setModalMode("add");
    setToolForm(EMPTY_FORM);
    setToolFormError("");
    setIsToolModalOpen(true);
  }, []);

  const openEditModal = useCallback((tool) => {
    if (!tool || tool.isDefault) return;
    setModalMode("edit");
    setToolForm(buildFormState(tool));
    setToolFormError("");
    setIsToolModalOpen(true);
  }, []);

  const closeToolModal = useCallback(() => {
    if (isSavingTool) return;
    setIsToolModalOpen(false);
    setToolFormError("");
    setToolForm(EMPTY_FORM);
  }, [isSavingTool]);

  const handleToolFormChange = useCallback((field, value) => {
    setToolForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "canEmbed" && !value ? { embedUrl: "" } : {}),
    }));
  }, []);

  const handleSaveTool = useCallback(async () => {
    const name = toolForm.name.trim();
    const description = toolForm.description.trim();
    const launchUrl = normalizeHttpUrl(toolForm.launchUrl);
    const embedUrl = toolForm.canEmbed
      ? normalizeHttpUrl(toolForm.embedUrl) || launchUrl
      : "";

    if (!name) {
      setToolFormError(t("toolsValidationName"));
      return;
    }

    if (!launchUrl) {
      setToolFormError(t("toolsValidationLaunchUrl"));
      return;
    }

    if (toolForm.canEmbed && !embedUrl) {
      setToolFormError(t("toolsValidationEmbedUrl"));
      return;
    }

    setIsSavingTool(true);
    setToolFormError("");

    try {
      const savedTool = await studyToolsService.upsertStudyTool({
        id: toolForm.id,
        name,
        description,
        launchUrl,
        embedUrl,
        canEmbed: Boolean(toolForm.canEmbed),
        category: toolForm.canEmbed ? "embedded" : "external",
        createdAt: toolForm.createdAt,
      });

      const decoratedTool = decorateStudyTool(savedTool);
      setFeedback({
        type: "success",
        text: t(
          modalMode === "edit" ? "toolsUpdatedSuccess" : "toolsAddedSuccess",
        ),
      });
      setIsToolModalOpen(false);
      setToolForm(EMPTY_FORM);
      setActiveToolId(decoratedTool.id);
      setMobileShowPanel(true);
      beginToolLoad(decoratedTool);
    } catch (error) {
      console.error("Failed to save study tool:", error);
      setToolFormError(t("toolsSaveFailed"));
    } finally {
      setIsSavingTool(false);
    }
  }, [beginToolLoad, modalMode, t, toolForm]);

  const handleDeleteTool = useCallback(
    async (tool) => {
      if (!tool || tool.isDefault) return;

      const accepted = await confirm({
        title: t("toolsDeleteTitle"),
        message: t("toolsDeleteMessage", {
          name: resolveToolName(tool),
        }),
        confirmText: t("delete"),
        cancelText: t("cancel"),
        variant: "danger",
      });

      if (!accepted) return;

      try {
        await studyToolsService.deleteStudyTool(tool.id);
        if (activeToolId === tool.id) {
          handleBackToList();
        }
        setFeedback({ type: "success", text: t("toolsDeletedSuccess") });
      } catch (error) {
        console.error("Failed to delete study tool:", error);
        setFeedback({ type: "error", text: t("toolsDeleteFailed") });
      }
    },
    [activeToolId, confirm, handleBackToList, resolveToolName, t],
  );

  const showIframe = activeTool?.canEmbed && !iframeError;
  const showFallback = activeTool && (!activeTool.canEmbed || iframeError);
  const feedbackIsError = feedback?.type === "error";

  const renderToolCard = (tool) => {
    const isActive = activeTool?.id === tool.id;
    const toolName = resolveToolName(tool);
    const toolDescription = resolveToolDescription(tool);

    return (
      <button
        key={tool.id}
        id={`tool-card-${tool.id}`}
        type="button"
        onClick={() => handleSelectTool(tool)}
        className={`tools-card ${isActive ? "active" : ""} ${isDarkMode ? "dark" : ""}`}
        style={{
          "--tool-gradient": tool.gradient,
          "--tool-accent": tool.accentColor,
          "--tool-bg-light": tool.bgLight,
          "--tool-bg-dark": tool.bgDark,
        }}
      >
        <ToolLogo tool={tool} className="tools-card-icon" imgClassName="tools-card-logo-image" />
        <div className="tools-card-content">
          <div className="tools-card-meta-row">
            <h3 className="tools-card-title">{toolName}</h3>
            <span className={`tools-card-chip ${isDarkMode ? "dark" : ""}`}>
              {tool.isDefault ? t("toolsDefaultBadge") : t("toolsCustomBadge")}
            </span>
          </div>
          <p className="tools-card-desc">{toolDescription}</p>
        </div>
        <div className="tools-card-right">
          {!tool.canEmbed && (
            <span className={`tools-card-badge ${isDarkMode ? "dark" : ""}`}>
              <i className="fas fa-up-right-from-square"></i>
            </span>
          )}
          {!tool.isDefault && (
            <div className="tools-card-actions">
              <button
                type="button"
                className={`tools-card-action-btn ${isDarkMode ? "dark" : ""}`}
                title={t("toolsEditCustom")}
                onClick={(event) => {
                  event.stopPropagation();
                  openEditModal(tool);
                }}
              >
                <i className="fas fa-pen"></i>
              </button>
              <button
                type="button"
                className={`tools-card-action-btn ${isDarkMode ? "dark" : ""}`}
                title={t("toolsDeleteCustom")}
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteTool(tool);
                }}
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          )}
          <i
            className={`fas fa-chevron-right tools-card-arrow ${isDarkMode ? "dark" : ""}`}
          ></i>
        </div>
      </button>
    );
  };

  const renderToolSection = (titleKey, descKey, tools) => (
    <section className="tools-section" key={titleKey}>
      <div className="tools-section-header">
        <div>
          <h2 className={`tools-section-title ${isDarkMode ? "dark" : ""}`}>
            {t(titleKey)}
          </h2>
          <p className={`tools-section-desc ${isDarkMode ? "dark" : ""}`}>
            {t(descKey)}
          </p>
        </div>
        <span className={`tools-section-count ${isDarkMode ? "dark" : ""}`}>
          {tools.length}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {tools.length > 0 ? (
          tools.map(renderToolCard)
        ) : (
          <div className={`tools-section-empty ${isDarkMode ? "dark" : ""}`}>
            {t("toolsSectionEmpty")}
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div
      className={`flex h-screen w-full overflow-hidden ${isDarkMode ? "sf-dark-shell" : "bg-gradient-to-br from-slate-50 to-white"}`}
    >
      <Sidebar user={user} />

      <main
        className="flex-1 flex flex-col h-full overflow-hidden md:pb-0"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 12px)",
          paddingBottom: "max(0px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex-1 w-full px-4 py-3 pb-[20rem] md:px-6 md:py-4 md:pb-0 flex flex-col gap-3 md:h-full overflow-hidden">
          <div
            className={`rounded-xl p-3 border shadow-sm flex-shrink-0 ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-100"}`}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-0.5">
                <h1
                  className={`text-xl md:text-2xl font-bold leading-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  <i className="fas fa-toolbox mr-2 text-blue-500"></i>
                  {t("toolsTitle")}
                </h1>
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                  {t("toolsSubtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <i className="fas fa-plus"></i>
                {t("toolsAddCustom")}
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                feedbackIsError
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <i
                  className={`fas ${feedbackIsError ? "fa-circle-exclamation" : "fa-circle-check"}`}
                ></i>
                <span>{feedback.text}</span>
              </div>
            </div>
          )}

          <div className="tools-layout flex-1 min-h-0 overflow-hidden">
            <div
              className={`tools-sidebar ${mobileShowPanel ? "tools-sidebar-hidden-mobile" : ""}`}
            >
              <div className="flex flex-col gap-4">
                {renderToolSection(
                  "toolsEmbeddedSectionTitle",
                  "toolsEmbeddedSectionDesc",
                  embeddedTools,
                )}
                {renderToolSection(
                  "toolsExternalSectionTitle",
                  "toolsExternalSectionDesc",
                  externalTools,
                )}
              </div>

              <div className={`tools-info-card ${isDarkMode ? "dark" : ""}`}>
                <div className="tools-info-icon">
                  <i className="fas fa-circle-info"></i>
                </div>
                <div className="flex flex-col gap-1">
                  <p>{t("toolsInfoText")}</p>
                  {isLoadingCustomTools ? (
                    <span className="tools-inline-note">{t("toolsLoadingCustom")}</span>
                  ) : (
                    <span className="tools-inline-note">
                      {t("toolsCustomCount", { n: String(customTools.length) })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`tools-panel ${mobileShowPanel ? "tools-panel-visible-mobile" : ""} ${isDarkMode ? "dark" : ""}`}
            >
              {!activeTool ? (
                <div className="tools-empty-state">
                  <div className={`tools-empty-icon ${isDarkMode ? "dark" : ""}`}>
                    <i className="fas fa-arrow-pointer"></i>
                  </div>
                  <h3 className={`tools-empty-title ${isDarkMode ? "dark" : ""}`}>
                    {t("toolSelectPrompt")}
                  </h3>
                  <p className={`tools-empty-desc ${isDarkMode ? "dark" : ""}`}>
                    {t("toolsEmptyStateDesc")}
                  </p>
                </div>
              ) : (
                <>
                  <div className={`tools-panel-header ${isDarkMode ? "dark" : ""}`}>
                    <button
                      type="button"
                      onClick={handleBackToList}
                      className={`tools-panel-back md:hidden ${isDarkMode ? "dark" : ""}`}
                    >
                      <i className="fas fa-arrow-left"></i>
                    </button>
                    <ToolLogo tool={activeTool} className="tools-panel-header-icon" imgClassName="tools-panel-logo-image" />
                    <div className="min-w-0 flex-1">
                      <span
                        className={`tools-panel-header-title ${isDarkMode ? "dark" : ""}`}
                      >
                        {resolveToolName(activeTool)}
                      </span>
                      <p className={`tools-panel-header-meta ${isDarkMode ? "dark" : ""}`}>
                        {activeTool.canEmbed
                          ? t("toolsEmbeddedSectionTitle")
                          : t("toolsExternalSectionTitle")}
                      </p>
                    </div>
                    <div className="tools-panel-header-actions">
                      {!activeTool.isDefault && (
                        <button
                          type="button"
                          onClick={() => openEditModal(activeTool)}
                          className={`tools-panel-action-btn ${isDarkMode ? "dark" : ""}`}
                          title={t("toolsEditCustom")}
                        >
                          <i className="fas fa-pen"></i>
                        </button>
                      )}
                      {!activeTool.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTool(activeTool)}
                          className={`tools-panel-action-btn ${isDarkMode ? "dark" : ""}`}
                          title={t("toolsDeleteCustom")}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                      {activeTool.canEmbed && (
                        <button
                          type="button"
                          onClick={handleRefreshIframe}
                          className={`tools-panel-action-btn ${isDarkMode ? "dark" : ""}`}
                          title={t("toolRefresh")}
                        >
                          <i className="fas fa-rotate-right"></i>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenNewTab(activeTool)}
                        className={`tools-panel-action-btn ${isDarkMode ? "dark" : ""}`}
                        title={t("toolOpenInNewTab")}
                      >
                        <i className="fas fa-up-right-from-square"></i>
                      </button>
                    </div>
                  </div>

                  <div className="tools-panel-body">
                    {iframeLoading && (
                      <div className={`tools-loading-overlay ${isDarkMode ? "dark" : ""}`}>
                        <div className="tools-loading-spinner"></div>
                        <p className={`tools-loading-text ${isDarkMode ? "dark" : ""}`}>
                          {t("toolLoading")}
                        </p>
                      </div>
                    )}

                    {showFallback && !iframeLoading && (
                      <div className="tools-error-state">
                        <ToolLogo tool={activeTool} className="tools-error-icon" imgClassName="tools-error-logo-image" />
                        <h3 className={`tools-error-title ${isDarkMode ? "dark" : ""}`}>
                          {resolveToolName(activeTool)}
                        </h3>
                        <p className={`tools-error-desc ${isDarkMode ? "dark" : ""}`}>
                          {t(activeTool.canEmbed ? "toolIframeBlocked" : "toolExternalOnly")}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenNewTab(activeTool)}
                          className="tools-open-btn"
                          style={{ background: activeTool.gradient }}
                        >
                          <i className="fas fa-up-right-from-square"></i>
                          {t("toolOpenInNewTab")}
                        </button>
                        <p className={`tools-error-url ${isDarkMode ? "dark" : ""}`}>
                          <i className="fas fa-link"></i>
                          {activeTool.launchUrl}
                        </p>
                      </div>
                    )}

                    {showIframe && (
                      <iframe
                        ref={iframeRef}
                        key={`${activeTool.id}-${iframeInstanceKey}`}
                        src={activeTool.embedUrl}
                        title={resolveToolName(activeTool)}
                        className="tools-iframe"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                        allow="clipboard-write; clipboard-read; autoplay; fullscreen; picture-in-picture"
                        referrerPolicy="origin"
                        onLoad={handleIframeLoad}
                        onError={handleIframeError}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {isToolModalOpen && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
          onClick={closeToolModal}
        >
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-200"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={`flex items-center justify-between border-b px-5 py-4 ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}
            >
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  {t(modalMode === "edit" ? "toolsEditTitle" : "toolsAddTitle")}
                </h3>
                <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                  {t("toolsModalSubtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={closeToolModal}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex flex-col gap-4 px-5 py-4">
              {toolFormError && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? "border-red-900/60 bg-red-950/30 text-red-300" : "border-red-200 bg-red-50 text-red-600"}`}
                >
                  <div className="flex items-center gap-2">
                    <i className="fas fa-circle-exclamation"></i>
                    <span>{toolFormError}</span>
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className={`mb-2 block text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    {t("toolsFieldName")}
                  </label>
                  <input
                    type="text"
                    value={toolForm.name}
                    onChange={(event) =>
                      handleToolFormChange("name", event.target.value)
                    }
                    placeholder={t("toolsFieldNamePlaceholder")}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${isDarkMode ? "border-slate-600 bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500" : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500"}`}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={`mb-2 block text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    {t("toolsFieldDescription")}
                  </label>
                  <textarea
                    value={toolForm.description}
                    onChange={(event) =>
                      handleToolFormChange("description", event.target.value)
                    }
                    rows={3}
                    placeholder={t("toolsFieldDescriptionPlaceholder")}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${isDarkMode ? "border-slate-600 bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500" : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500"}`}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={`mb-2 block text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    {t("toolsFieldLaunchUrl")}
                  </label>
                  <input
                    type="url"
                    value={toolForm.launchUrl}
                    onChange={(event) =>
                      handleToolFormChange("launchUrl", event.target.value)
                    }
                    placeholder="https://example.com"
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${isDarkMode ? "border-slate-600 bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500" : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500"}`}
                  />
                </div>

                <div className={`rounded-xl border px-4 py-3 ${isDarkMode ? "border-slate-700 bg-slate-900/40" : "border-gray-200 bg-gray-50"}`}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    {t("toolsFieldEmbedMode")}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleToolFormChange("canEmbed", true)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${toolForm.canEmbed ? "border-blue-600 bg-blue-600 text-white" : isDarkMode ? "border-slate-600 bg-slate-800 text-slate-300" : "border-gray-200 bg-white text-gray-700"}`}
                    >
                      {t("toolsEmbedModeInline")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToolFormChange("canEmbed", false)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${!toolForm.canEmbed ? "border-blue-600 bg-blue-600 text-white" : isDarkMode ? "border-slate-600 bg-slate-800 text-slate-300" : "border-gray-200 bg-white text-gray-700"}`}
                    >
                      {t("toolsEmbedModeExternal")}
                    </button>
                  </div>
                </div>

                {toolForm.canEmbed && (
                  <div className="md:col-span-2">
                    <label className={`mb-2 block text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                      {t("toolsFieldEmbedUrl")}
                    </label>
                    <input
                      type="url"
                      value={toolForm.embedUrl}
                      onChange={(event) =>
                        handleToolFormChange("embedUrl", event.target.value)
                      }
                      placeholder="https://example.com/embed"
                      className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${isDarkMode ? "border-slate-600 bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500" : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500"}`}
                    />
                    <p className={`mt-2 text-xs leading-relaxed ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                      {t("toolsFieldEmbedUrlHelp")}
                    </p>
                  </div>
                )}

                <div className="md:col-span-2">
                  <p className={`text-xs leading-relaxed ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    {t("toolsAutoLogoHint")}
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`flex gap-3 border-t px-5 py-4 ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}
            >
              <button
                type="button"
                onClick={closeToolModal}
                disabled={isSavingTool}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${isDarkMode ? "border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700" : "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200"} disabled:opacity-50`}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleSaveTool}
                disabled={isSavingTool}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {isSavingTool ? t("saving") : t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsPage;
