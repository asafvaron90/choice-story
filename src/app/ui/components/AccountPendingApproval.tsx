'use client';

import { useTranslation } from '@/app/hooks/useTranslation';
import { Account } from '@/models';
import Image from 'next/image';

interface AccountPendingApprovalProps {
  userAccountData: Account | null;
  currentUser: Account | null;
}

export default function AccountPendingApproval({ userAccountData, currentUser }: AccountPendingApprovalProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center min-h-screen pt-16 px-4">
      <div className="bg-[#6366f1] rounded-2xl p-6 max-w-md w-full shadow-xl">
        {/* Party Popper Icon */}
        <div className="flex justify-center mb-0">
          <Image
            src="/icons/party.svg"
            alt="Celebration"
            width={160}
            height={160}
            className="brightness-0 invert"
          />
        </div>

        {/* Main Heading */}
        <h1 className="text-3xl font-bold text-white text-center mb-4">
          {t.auth.pendingApproval}
        </h1>

        {/* Subtext */}
        <p className="text-white/90 text-center text-lg leading-relaxed mb-8 whitespace-pre-line">
          {t.auth.pendingApprovalMessage}
        </p>

        {/* Account Status Card */}
        <div className="bg-white/95 rounded-xl p-4 shadow-sm">
          <p className="font-semibold text-gray-800 mb-3">
            {t.auth.accountStatus}
          </p>
          <p className="text-gray-600 mb-2">
            {t.auth.email} {userAccountData?.email || currentUser?.email}
          </p>
          <p className="text-gray-600 mb-2">
            {t.auth.accessRights}{' '}
            {userAccountData?.access_rights || (
              <span className="italic text-violet-600">{t.auth.awaitingApproval}</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
