import Link from "next/link";

import { Command } from "lucide-react";

import { ChangePasswordForm } from "../../_components/change-password-form";

export default function ChangePasswordPage() {
  return (
    <div className="flex h-dvh">
      <div className="hidden bg-primary lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <Command className="mx-auto size-12 text-primary-foreground" />
          <h1 className="mt-6 font-light text-4xl text-primary-foreground">Almost there</h1>
          <p className="mt-2 text-primary-foreground/80">Set a new password to continue.</p>
        </div>
      </div>
      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center">
            <div className="font-medium tracking-tight">Change password</div>
            <p className="text-muted-foreground text-sm">
              Use the temporary password from your approval email (API console in dev).
            </p>
          </div>
          <ChangePasswordForm />
          <p className="text-center text-muted-foreground text-xs">
            <Link prefetch={false} href="/auth/v1/login" className="text-primary">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
