import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import * as api from "../../api";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { PasswordCard } from "./PasswordCard";
import {
  SettingsCard,
  settingsButtonClass,
  settingsPrimaryButtonClass,
  settingsSelectClass,
} from "./SettingsRow";

export const AccountSettings: React.FC = () => {
  const {
    user: authUser,
    logout,
    authEnabled,
    authMode,
    updateUser,
  } = useAuth();
  const mustResetPassword = Boolean(authUser?.mustResetPassword);
  const [email, setEmail] = useState(authUser?.email || "");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setEmail(authUser?.email || "");
  }, [authUser?.email]);

  const handleUpdateEmail = async () => {
    if (mustResetPassword) {
      setError("You must reset your password before changing your email");
      return;
    }
    if (!email.trim()) {
      setError("Email cannot be empty");
      return;
    }
    if (!emailCurrentPassword) {
      setError("Current password is required to change email");
      return;
    }

    setEmailLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.api.put<{
        user: {
          id: string;
          email: string;
          name: string;
          createdAt: string;
          updatedAt: string;
        };
      }>("/auth/email", {
        email: email.trim(),
        currentPassword: emailCurrentPassword,
      });

      updateUser(response.data.user);

      setSuccess("Email updated successfully");
      setShowEmailForm(false);
      setEmailCurrentPassword("");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to update email"));
    } finally {
      setEmailLoading(false);
    }
  };

  if (!authEnabled) return null;

  return (
    <section aria-label="Account security" className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
        Account security
      </h2>
      {error && (
        <p role="alert" className="ui-alert-error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-green-800 dark:text-green-200">
          {success}
        </p>
      )}
      <SettingsCard>
        <div className="px-4 py-3.5 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="min-w-0 flex-1 basis-40">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                Login email
              </h3>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-neutral-400">
                {authUser?.email}
              </p>
            </div>
            {!showEmailForm && (
              <button
                onClick={() => {
                  setShowEmailForm(true);
                  setEmailCurrentPassword("");
                  setError("");
                  setSuccess("");
                }}
                disabled={mustResetPassword}
                className={`${settingsButtonClass} ml-auto`}
              >
                Change
              </button>
            )}
          </div>

          {showEmailForm && (
            <div className="mt-3 max-w-md space-y-3">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-xs font-semibold text-slate-500 dark:text-neutral-400"
                >
                  New email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${settingsSelectClass} w-full`}
                />
              </div>
              <div>
                <label
                  htmlFor="emailCurrentPassword"
                  className="mb-1 block text-xs font-semibold text-slate-500 dark:text-neutral-400"
                >
                  Current password
                </label>
                <input
                  id="emailCurrentPassword"
                  type="password"
                  value={emailCurrentPassword}
                  onChange={(e) => setEmailCurrentPassword(e.target.value)}
                  className={`${settingsSelectClass} w-full`}
                  placeholder="Enter current password"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateEmail}
                  disabled={
                    emailLoading ||
                    !email.trim() ||
                    !emailCurrentPassword ||
                    email.trim() === authUser?.email
                  }
                  className={settingsPrimaryButtonClass}
                >
                  {emailLoading ? "Saving…" : "Save email"}
                </button>
                <button
                  onClick={() => {
                    setShowEmailForm(false);
                    setEmail(authUser?.email || "");
                    setEmailCurrentPassword("");
                    setError("");
                  }}
                  disabled={emailLoading}
                  className={settingsButtonClass}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </SettingsCard>
      {authMode !== "oidc_enforced" && (
        <PasswordCard
          mustResetPassword={mustResetPassword}
          logout={logout}
          onError={setError}
          onSuccess={setSuccess}
        />
      )}
    </section>
  );
};
