"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import Image from "next/image";
import Link from "next/link";
import { Camera, Check, ChevronLeft, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { HTMLAttributes } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SHIMMER_AVATAR } from "@/lib/shimmer";
import { cn } from "@/lib/utils";
import type { ProfileUserFieldsFragment } from "@/types/__generated__/graphql";
import { useAuthStore } from "@/stores/auth";
import { profileReturnHref } from "../lib/settingsReturn";
import {
  useCheckUsername,
  useMyProfile,
  useUpdateProfile,
} from "../hooks/useMyProfile";
import { useAvatarUpload } from "../hooks/useAvatarUpload";

type FormValues = {
  firstName: string;
  lastName: string;
  username: string;
  bio: string;
  website: string;
};

type Field = {
  name: keyof FormValues;
  label: string;
  placeholder: string;
  maxLength: number;
  multiline?: boolean;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
};

const fields: Field[] = [
  {
    name: "firstName",
    label: "First name",
    placeholder: "First name",
    maxLength: 50,
  },
  {
    name: "lastName",
    label: "Last name",
    placeholder: "Last name",
    maxLength: 50,
  },
  {
    name: "username",
    label: "Username",
    placeholder: "Username",
    maxLength: 30,
  },
  {
    name: "bio",
    label: "Bio",
    placeholder: "Tell your story...",
    maxLength: 160,
    multiline: true,
  },
  {
    name: "website",
    label: "Website",
    placeholder: "yoursite.com",
    maxLength: 100,
    inputMode: "url",
  },
];

function getInitialForm(user: ProfileUserFieldsFragment): FormValues {
  return {
    firstName: user.profile?.firstName ?? "",
    lastName: user.profile?.lastName ?? "",
    username: user.username ?? "",
    bio: user.profile?.bio ?? "",
    website: user.profile?.website ?? "",
  };
}

function getDisplayName(user: ProfileUserFieldsFragment, form: FormValues) {
  return (
    [form.firstName, form.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "Your profile"
  );
}

function EditProfileSkeleton({ lang }: { lang: string }) {
  const backHref = useProfileBackHref(lang);
  return (
    <div className="min-h-svh animate-pulse bg-app">
      <div
        className="sticky top-0 z-20 flex h-14 items-center justify-between border-b px-3"
        style={{
          backgroundColor: "rgb(var(--color-bg) / 0.94)",
          borderColor: "rgb(var(--color-border))",
        }}
      >
        <Link
          href={backHref}
          className="flex h-10 w-10 items-center justify-center rounded-md"
          aria-label="Back to profile"
        >
          <ChevronLeft size={38} strokeWidth={2.5} aria-hidden />
        </Link>
        <div
          className="h-5 w-24 rounded-md"
          style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
        />
        <div className="h-10 w-14" />
      </div>
      <div className="px-4 py-5">
        <div className="mb-6 flex items-center gap-4">
          <div
            className="h-20 w-20 rounded-full"
            style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
          />
          <div className="flex-1 space-y-2">
            <div
              className="h-5 w-32 rounded-md"
              style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
            />
            <div
              className="h-4 w-24 rounded-md"
              style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
            />
          </div>
        </div>
        <div className="space-y-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div
                className="h-3 w-20 rounded-md"
                style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
              />
              <div
                className="h-11 rounded-md"
                style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Back out to wherever this screen was opened from — Settings keeps its tab.
 * Read from the URL rather than history so a refresh or a shared link behaves
 * the same as an in-app tap.
 */
function useProfileBackHref(lang: string): string {
  const searchParams = useSearchParams();
  return profileReturnHref(lang, searchParams.get("from"));
}

export function EditProfileScreen({ lang, embedded = false }: { lang: string; embedded?: boolean }) {
  const { data, loading } = useMyProfile();

  if (loading && !data) return <EditProfileSkeleton lang={lang} />;
  if (!data?.me) return null;

  return <EditProfileForm key={data.me.id} user={data.me} lang={lang} embedded={embedded} />;
}

function EditProfileForm({
  user,
  lang,
  embedded = false,
}: {
  user: ProfileUserFieldsFragment;
  lang: string;
  embedded?: boolean;
}) {
  const backHref = useProfileBackHref(lang);
  const router = useRouter();
  const [form, setForm] = useState<FormValues>(() => getInitialForm(user));
  const [usernameState, setUsernameState] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [updateProfile, { loading, error }] = useUpdateProfile();
  const [checkUsername] = useCheckUsername();
  const setUser = useAuthStore((s) => s.setUser);

  // Avatar: local override (CDN url returned by the upload endpoint). null until
  // the user picks a new picture.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    upload: uploadAvatar,
    uploading: avatarUploading,
    error: avatarError,
  } = useAvatarUpload();

  const initial = getInitialForm(user);
  const fieldsChanged = fields.some(
    (field) => form[field.name] !== initial[field.name],
  );
  const hasChanges = fieldsChanged || avatarUrl !== null;
  const usernameInvalid =
    form.username !== initial.username && form.username.trim().length < 3;
  const saveDisabled =
    !hasChanges ||
    loading ||
    avatarUploading ||
    usernameInvalid ||
    usernameState === "checking" ||
    usernameState === "taken";

  const displayName = getDisplayName(user, form);
  const avatar = avatarUrl ?? user.profile?.avatar;
  const initials =
    [form.firstName[0], form.lastName[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "?";

  useEffect(() => {
    return () => {
      if (usernameTimer.current) clearTimeout(usernameTimer.current);
    };
  }, []);

  function handleUsernameChange(value: string) {
    const normalized = value.toLowerCase().replace(/[^a-z0-9_.]/g, "");
    setForm((current) => ({ ...current, username: normalized }));

    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (normalized.length < 3 || normalized === (user.username ?? "")) {
      setUsernameState("idle");
      return;
    }

    setUsernameState("checking");
    usernameTimer.current = setTimeout(async () => {
      const { data } = await checkUsername({
        variables: { username: normalized },
      });
      setUsernameState(data?.checkUsername.available ? "available" : "taken");
    }, 500);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again still fires onChange
    e.target.value = "";
    if (!file) return;
    const url = await uploadAvatar(file);
    if (url) setAvatarUrl(url);
  }

  async function handleSave() {
    if (saveDisabled) return;

    const input: Record<string, string> = {};
    if (form.firstName !== initial.firstName) input.firstName = form.firstName;
    if (form.lastName !== initial.lastName) input.lastName = form.lastName;
    if (form.username !== initial.username) input.username = form.username;
    if (form.bio !== initial.bio) input.bio = form.bio;
    if (form.website !== initial.website) input.website = form.website;
    if (avatarUrl !== null) input.avatar = avatarUrl;

    const { data } = await updateProfile({ variables: { input } });
    if (!data?.updateProfile) return;

    const updated = data.updateProfile;
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      setUser({
        ...currentUser,
        profile: updated.profile
          ? {
              firstName: updated.profile.firstName ?? null,
              lastName: updated.profile.lastName ?? null,
              avatar: updated.profile.avatar ?? null,
            }
          : null,
      });
    }

    if (!embedded) router.replace(`/${lang}/profile`);
  }

  return (
    <div className="min-h-svh bg-app">
      <header
        className="sticky top-0 z-20 flex h-14 items-center justify-between border-b px-3 md:h-16 md:px-5 lg:px-6"
        style={{
          backgroundColor: "rgb(var(--color-bg) / 0.94)",
          borderColor: "rgb(var(--color-border))",
          backdropFilter: "blur(14px) saturate(150%)",
          WebkitBackdropFilter: "blur(14px) saturate(150%)",
        }}
      >
        {!embedded && <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-14 w-14 rounded-md"
          style={{ color: "rgb(var(--color-text))" }}
        >
          <Link href={backHref} aria-label="Back to profile">
            <ChevronLeft size={38} strokeWidth={2.5} />
          </Link>
        </Button>}

        <h1
          className="font-bold"
          style={{
            color: "rgb(var(--color-text))",
            fontSize: "var(--text-base)",
          }}
        >
          Edit profile
        </h1>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={saveDisabled}
          className="h-10 px-2 font-bold md:hidden"
          style={{
            color: "rgb(var(--brand-primary))",
            fontSize: "var(--text-sm)",
          }}
        >
          {loading ? <InterlockingBalls size={16} /> : "Save"}
        </Button>
      </header>

      <main
        className="px-4 pt-5 md:px-6 md:pt-6 lg:px-8 lg:pt-8"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 1rem)" }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />

        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-8">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div
              className="mb-6 flex items-center gap-4 md:mb-0 md:rounded-[28px] md:border md:bg-[rgb(var(--color-bg-elevated)/0.72)] md:p-5 lg:flex-col lg:items-start lg:rounded-[32px] lg:p-6"
              style={{ borderColor: "rgb(229 231 235)" }}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border transition-opacity active:opacity-80 md:h-24 md:w-24 lg:h-28 lg:w-28"
                style={{
                  background: avatar
                    ? "rgb(var(--color-bg-subtle))"
                    : "linear-gradient(135deg, rgb(var(--brand-primary)), rgb(var(--brand-highlight)) 62%, rgb(var(--brand-accent)))",
                  borderColor: "rgb(var(--color-bg-elevated))",
                }}
                aria-label="Change profile picture"
              >
                {avatar ? (
                  <Image
                    src={avatar}
                    alt={displayName}
                    fill
                    sizes="(max-width: 768px) 80px, (max-width: 1280px) 96px, 112px"
                    className="object-cover"
                    placeholder="blur"
                    blurDataURL={SHIMMER_AVATAR}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span
                      className="select-none font-bold text-white"
                      style={{ fontSize: "var(--text-lg)" }}
                    >
                      {initials}
                    </span>
                  </div>
                )}
                <span
                  className="absolute inset-0 flex items-center justify-center transition-opacity"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.4)",
                    opacity: avatarUploading ? 1 : undefined,
                  }}
                >
                  {avatarUploading ? (
                    <InterlockingBalls size={22} />
                  ) : (
                    <Camera
                      size={22}
                      strokeWidth={2.2}
                      className="text-white opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  )}
                </span>
              </button>

              <div className="min-w-0 flex-1 lg:w-full">
                <p
                  className="truncate font-bold"
                  style={{
                    color: "rgb(var(--color-text))",
                    fontSize: "var(--text-base)",
                  }}
                >
                  {displayName}
                </p>
                <p
                  className="mt-0.5 truncate"
                  style={{
                    color: "rgb(var(--color-text-muted))",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  @{form.username || "username"}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="mt-3 font-semibold"
                  style={{
                    color: "rgb(var(--brand-primary))",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  {avatarUploading ? "Uploading…" : "Change photo"}
                </button>
                <p
                  className="mt-2 hidden leading-snug md:block"
                  style={{
                    color: "rgb(var(--color-text-muted))",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  This is the identity buyers and sellers will see across your
                  profile, posts, and conversations.
                </p>
                {avatarError && (
                  <p
                    className="mt-2"
                    style={{
                      color: "rgb(var(--color-error))",
                      fontSize: "var(--text-xs)",
                    }}
                  >
                    {avatarError}
                  </p>
                )}
              </div>
            </div>
          </aside>

          <section
            className="md:rounded-[28px] md:border md:bg-[rgb(var(--color-bg-elevated)/0.72)] md:p-5 lg:rounded-[32px] lg:p-7"
            style={{ borderColor: "rgb(229 231 235)" }}
          >
            <div className="hidden md:block">
              <h2
                className="font-bold"
                style={{
                  color: "rgb(var(--color-text))",
                  fontSize: "var(--text-lg)",
                }}
              >
                Profile details
              </h2>
              <p
                className="mt-1"
                style={{
                  color: "rgb(var(--color-text-muted))",
                  fontSize: "var(--text-sm)",
                }}
              >
                Keep your profile clear and trustworthy so local buyers know who
                they are dealing with.
              </p>
            </div>

            <div className="space-y-4 md:mt-6 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-5 md:space-y-0 lg:gap-x-5 lg:gap-y-6">
              {fields.map((field) => {
                const value = form[field.name];
                const isUsername = field.name === "username";

                return (
                  <div
                    key={field.name}
                    className={cn(
                      "space-y-1.5",
                      (field.name === "username" || field.multiline) &&
                        "md:col-span-2",
                    )}
                  >
                    <label
                      htmlFor={`edit-profile-${field.name}`}
                      className="font-semibold"
                      style={{
                        color: "rgb(var(--color-text-muted))",
                        fontSize: "var(--text-xs)",
                      }}
                    >
                      {field.label}
                    </label>

                    {field.multiline ? (
                      <>
                        <textarea
                          id={`edit-profile-${field.name}`}
                          value={value}
                          onChange={(e) =>
                            setForm((c) => ({ ...c, [field.name]: e.target.value }))
                          }
                          placeholder={field.placeholder}
                          maxLength={field.maxLength}
                          rows={4}
                          className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm placeholder:text-sm font-medium leading-relaxed outline-none transition-colors placeholder:opacity-40 focus:border-[rgb(var(--color-border))] md:min-h-36 md:rounded-2xl md:px-4 md:py-3"
                          style={{
                            backgroundColor: "rgb(var(--color-bg-elevated))",
                            borderColor: "rgb(var(--color-border))",
                            color: "rgb(var(--color-text))",
                            fontSize: "var(--text-sm)",
                          }}
                        />
                        <p
                          className="text-right"
                          style={{
                            color: "rgb(var(--color-text-muted))",
                            fontSize: "var(--text-xs)",
                          }}
                        >
                          {value.length}/{field.maxLength}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="relative">
                          {isUsername && (
                            <span
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 md:left-4"
                              style={{
                                color: "rgb(var(--color-text-muted))",
                                fontSize: "var(--text-md)",
                              }}
                            >
                              @
                            </span>
                          )}
                          <input
                            id={`edit-profile-${field.name}`}
                            type={field.name === "website" ? "url" : "text"}
                            inputMode={field.inputMode}
                            value={value}
                            onChange={(e) =>
                              isUsername
                                ? handleUsernameChange(e.target.value)
                                : setForm((c) => ({
                                    ...c,
                                    [field.name]: e.target.value,
                                  }))
                            }
                            placeholder={field.placeholder}
                            maxLength={field.maxLength}
                            className="h-12 w-full rounded-lg border px-3 text-sm font-medium outline-none transition-colors placeholder:text-sm placeholder:opacity-40 md:h-13 md:rounded-2xl md:px-4"
                            style={{
                              backgroundColor: "rgb(var(--color-bg-elevated))",
                              borderColor:
                                isUsername && usernameState === "taken"
                                  ? "rgb(var(--color-error))"
                                  : isUsername && usernameState === "available"
                                    ? "rgb(var(--color-success))"
                                    : "rgb(var(--color-border))",
                              color: "rgb(var(--color-text))",
                              fontSize: "var(--text-sm)",
                              paddingLeft: isUsername ? "2.1rem" : undefined,
                            }}
                          />
                          {isUsername && usernameState !== "idle" && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 md:right-4">
                              {usernameState === "checking" && (
                                <InterlockingBalls size={15} />
                              )}
                              {usernameState === "available" && (
                                <Check
                                  size={15}
                                  strokeWidth={2.5}
                                  style={{ color: "rgb(var(--color-success))" }}
                                />
                              )}
                              {usernameState === "taken" && (
                                <X
                                  size={15}
                                  strokeWidth={2.5}
                                  style={{ color: "rgb(var(--color-error))" }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                        {isUsername && (
                          <p
                            style={{
                              color:
                                usernameState === "taken" || usernameInvalid
                                  ? "rgb(var(--color-error))"
                                  : usernameState === "available"
                                    ? "rgb(var(--color-success))"
                                    : "rgb(var(--color-text-muted))",
                              fontSize: "var(--text-xs)",
                            }}
                          >
                            {usernameInvalid
                              ? "Username must be at least 3 characters"
                              : usernameState === "taken"
                                ? "That username is taken"
                                : usernameState === "available"
                                  ? "Username is available"
                                  : "Letters, numbers, dots and underscores"}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <p
                className="mt-5 rounded-md border px-3 py-2"
                style={{
                  backgroundColor: "rgb(var(--color-error) / 0.08)",
                  borderColor: "rgb(var(--color-error) / 0.24)",
                  color: "rgb(var(--color-error))",
                  fontSize: "var(--text-sm)",
                }}
              >
                {error.message}
              </p>
            )}
          </section>
        </div>
      </main>

      <div className="pointer-events-none fixed bottom-6 right-6 z-30 hidden md:block lg:bottom-8 lg:right-8">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saveDisabled}
          className="pointer-events-auto h-12 rounded-2xl bg-primary px-5 text-sm font-bold text-white shadow-[0_12px_32px_rgb(var(--brand-primary)/0.28)] transition-all hover:bg-primary/90 hover:shadow-[0_16px_40px_rgb(var(--brand-primary)/0.34)]"
        >
          {loading ? <InterlockingBalls size={16} /> : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
