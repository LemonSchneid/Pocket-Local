import { useEffect, useState, type FormEvent } from "react";

import type { Tag } from "../../db";
import { clearAllData } from "../../db";
import { createTag, deleteTag, listTags } from "../../db/tags";
import { getStoragePersistenceState } from "../../db/settings";

type StorageInfo = {
  usageBytes: number;
  quotaBytes: number;
  percentUsed: number;
};

function SettingsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [storageState, setStorageState] = useState<
    "unknown" | "granted" | "denied" | "unsupported"
  >("unknown");
  const [storageError, setStorageError] = useState<string | null>(null);
  const [clearStatus, setClearStatus] = useState<
    "idle" | "clearing" | "success" | "error"
  >("idle");
  const [clearError, setClearError] = useState<string | null>(null);

  const loadTags = async () => {
    const items = await listTags();
    setTags(items);
  };

  const formatBytes = (value: number) => {
    if (value === 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(
      units.length - 1,
      Math.floor(Math.log(value) / Math.log(1024)),
    );
    const size = value / 1024 ** index;
    return `${size.toFixed(size < 10 ? 1 : 0)} ${units[index]}`;
  };

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        const items = await listTags();
        if (isActive) {
          setTags(items);
        }
      } catch {
        if (isActive) {
          setError("Unable to load tags.");
          setStatus("error");
        }
      }

      try {
        if (!navigator.storage?.estimate) {
          if (isActive) {
            setStorageError("Storage usage is not available in this browser.");
          }
          return;
        }

        const estimate = await navigator.storage.estimate();
        const usageBytes = estimate.usage ?? 0;
        const quotaBytes = estimate.quota ?? 0;
        const percentUsed =
          quotaBytes > 0 ? Math.round((usageBytes / quotaBytes) * 100) : 0;
        if (isActive) {
          setStorageInfo({ usageBytes, quotaBytes, percentUsed });
        }
      } catch {
        if (isActive) {
          setStorageError("Unable to estimate storage usage.");
        }
      }

      try {
        const persistenceState = await getStoragePersistenceState();
        if (isActive) {
          setStorageState(persistenceState);
        }
      } catch {
        if (isActive) {
          setStorageState("unknown");
        }
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("saving");
    setError(null);

    try {
      const created = await createTag(newTagName);
      if (!created) {
        setError("Enter a tag name to add.");
        setStatus("idle");
        return;
      }
      await loadTags();
      setNewTagName("");
      setStatus("idle");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create tag.",
      );
      setStatus("error");
    }
  };

  const handleDelete = async (tag: Tag) => {
    setStatus("saving");
    setError(null);

    try {
      await deleteTag(tag.id);
      await loadTags();
      setStatus("idle");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete tag.",
      );
      setStatus("error");
    }
  };

  const handleClearAll = async () => {
    const confirmed = window.confirm(
      "This will permanently delete all saved articles, tags, and settings stored on this device.",
    );
    if (!confirmed) {
      return;
    }

    setClearStatus("clearing");
    setClearError(null);

    try {
      await clearAllData();
      setClearStatus("success");
      window.location.reload();
    } catch {
      setClearError("Unable to clear local data.");
      setClearStatus("error");
    }
  };

  return (
    <section className="page">
      <h2>Settings</h2>
      <section className="storage-settings">
        <div className="storage-settings__header">
          <h3>Storage</h3>
          <p>Keep your offline library safe on this device.</p>
        </div>
        {storageInfo ? (
          <div className="storage-settings__usage">
            <div className="storage-settings__row">
              <span>
                Used: {formatBytes(storageInfo.usageBytes)} of{" "}
                {formatBytes(storageInfo.quotaBytes)}
              </span>
              <span>{storageInfo.percentUsed}%</span>
            </div>
            <progress
              value={storageInfo.percentUsed}
              max={100}
              className={
                storageInfo.percentUsed >= 70
                  ? "storage-settings__progress storage-settings__progress--warn"
                  : "storage-settings__progress"
              }
            />
            {storageInfo.percentUsed >= 70 && (
              <p className="storage-settings__warning" role="alert">
                Warning: you are close to your storage limit. Consider exporting
                and clearing older items.
              </p>
            )}
          </div>
        ) : (
          <p className="storage-settings__empty">
            {storageError ?? "Loading storage usage…"}
          </p>
        )}
        <div className="storage-settings__status">
          <span>Persistence:</span>
          <strong>
            {storageState === "granted" && "Enabled"}
            {storageState === "denied" && "Not granted"}
            {storageState === "unsupported" && "Not supported"}
            {storageState === "unknown" && "Pending"}
          </strong>
        </div>
        {storageState === "unknown" && (
          <p className="storage-settings__note">
            Persistence will be requested automatically after your first
            successful import.
          </p>
        )}
      </section>
      <section className="data-settings">
        <div className="data-settings__header">
          <h3>Reset data</h3>
          <p>
            Remove everything stored locally, including articles, tags, and
            preferences.
          </p>
        </div>
        <div className="data-settings__actions">
          <button
            type="button"
            className="data-settings__button"
            onClick={handleClearAll}
            disabled={clearStatus === "clearing"}
          >
            Clear all local data
          </button>
          {clearStatus === "clearing" && (
            <span className="data-settings__status">Clearing…</span>
          )}
          {clearStatus === "error" && clearError && (
            <span className="data-settings__error" role="alert">
              {clearError}
            </span>
          )}
        </div>
      </section>
      <section className="tag-settings">
        <div className="tag-settings__header">
          <h3>Manage tags</h3>
          <p>Create and remove tags stored on this device.</p>
        </div>
        <form className="tag-settings__form" onSubmit={handleCreate}>
          <label htmlFor="settings-new-tag">New tag</label>
          <div className="tag-settings__input">
            <input
              id="settings-new-tag"
              type="text"
              value={newTagName}
              onChange={(event) => setNewTagName(event.target.value)}
              placeholder="Add a tag name"
            />
            <button type="submit" disabled={status === "saving"}>
              Create
            </button>
          </div>
        </form>
        {error ? (
          <p className="tag-settings__error" role="alert">
            {error}
          </p>
        ) : null}
        {tags.length === 0 ? (
          <p className="tag-settings__empty">No tags yet.</p>
        ) : (
          <ul className="tag-settings__list">
            {tags.map((tag) => (
              <li key={tag.id} className="tag-settings__item">
                <span>{tag.name}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(tag)}
                  disabled={status === "saving"}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="about-settings">
        <div className="about-settings__header">
          <h3>About</h3>
          <p>
            Local-first. No server dependency. Everything stays on this device
            unless you export it.
          </p>
        </div>
      </section>
    </section>
  );
}

export default SettingsPage;
