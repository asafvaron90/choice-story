'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import * as Sentry from "@sentry/nextjs";
import { Header } from '@/app/components/common/Header';
import { useAuth } from '@/app/context/AuthContext';
import { useTranslation } from '@/app/hooks/useTranslation';
import { Account } from '@/models';

type SortField = 'displayName' | 'email' | 'role' | 'access_rights' | 'kids_limit' | 'story_per_kid_limit' | 'createAt';
type SortDirection = 'asc' | 'desc';

export default function AdminAccountsPage() {
  const { t } = useTranslation();
  const { currentUser, firebaseUser, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>('');
  const [editingAccessRights, setEditingAccessRights] = useState<string>('');
  const [editingKidsLimit, setEditingKidsLimit] = useState<number | undefined>(undefined);
  const [editingStoryPerKidLimit, setEditingStoryPerKidLimit] = useState<number | undefined>(undefined);
  const [userAccountData, setUserAccountData] = useState<Account | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [sortField, setSortField] = useState<SortField>('createAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchUserAccount = useCallback(async () => {
    if (!firebaseUser || !currentUser) return;

    setCheckingRole(true);

    try {
      const token = await firebaseUser.getIdToken();
      
      const response = await fetch(`/api/account/me?uid=${currentUser.uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user account');
      }

      const data = await response.json();
      console.log('[Admin Panel] User account data:', data.account);
      setUserAccountData(data.account);
    } catch (err) {
      console.error('Error fetching user account:', err);
      Sentry.captureException(err);
    } finally {
      setCheckingRole(false);
    }
  }, [firebaseUser, currentUser]);

  const fetchAccounts = useCallback(async () => {
    if (!firebaseUser) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await firebaseUser.getIdToken();
      
      const response = await fetch('/api/admin/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch accounts');
      }

      const data = await response.json();
      setAccounts(data.accounts || []);
      
      Sentry.startSpan(
        {
          op: "ui.load",
          name: "Admin Accounts Loaded",
        },
        (span) => {
          span.setAttribute("accounts_count", data.accounts?.length || 0);
        },
      );
    } catch (err) {
      console.error('Error fetching accounts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch accounts';
      setError(errorMessage);
      Sentry.captureException(err);
    } finally {
      setIsLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (firebaseUser && currentUser) {
      fetchUserAccount();
    }
  }, [firebaseUser, currentUser, fetchUserAccount]);

  useEffect(() => {
    if (firebaseUser && userAccountData?.role) {
      fetchAccounts();
    }
  }, [firebaseUser, userAccountData, fetchAccounts]);

  const handleRefresh = () => {
    fetchAccounts();
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Admin Accounts Manual Refresh",
      },
      (span) => {
        span.setAttribute("action", "manual_refresh");
      },
    );
  };

  const handleEdit = (account: Account) => {
    setEditingUid(account.uid);
    setEditingRole(account.role || '');
    setEditingAccessRights(account.access_rights || '');
    setEditingKidsLimit(account.kids_limit);
    setEditingStoryPerKidLimit(account.story_per_kid_limit);
  };

  const handleCancel = () => {
    setEditingUid(null);
    setEditingRole('');
    setEditingAccessRights('');
    setEditingKidsLimit(undefined);
    setEditingStoryPerKidLimit(undefined);
  };

  const handleSave = async (uid: string) => {
    if (!firebaseUser) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await firebaseUser.getIdToken();
      
      const response = await fetch('/api/admin/accounts/update', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid,
          role: editingRole || null,
          access_rights: editingAccessRights,
          kids_limit: editingKidsLimit,
          story_per_kid_limit: editingStoryPerKidLimit,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update account');
      }

      const data = await response.json();
      
      // Update the account in the local state
      setAccounts(accounts.map(acc => 
        acc.uid === uid ? data.account : acc
      ));
      
      setEditingUid(null);
      setEditingRole('');
      setEditingAccessRights('');
      setEditingKidsLimit(undefined);
      setEditingStoryPerKidLimit(undefined);
      
      Sentry.startSpan(
        {
          op: "ui.click",
          name: "Admin Account Updated",
        },
        (span) => {
          span.setAttribute("account_uid", uid);
          span.setAttribute("new_role", editingRole);
          span.setAttribute("kids_limit", editingKidsLimit?.toString() || "none");
          span.setAttribute("story_per_kid_limit", editingStoryPerKidLimit?.toString() || "none");
        },
      );
    } catch (err) {
      console.error('Error updating account:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update account';
      setError(errorMessage);
      Sentry.captureException(err);
    } finally {
      setIsLoading(false);
    }
  };


  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAccounts = [...accounts].sort((a, b) => {
    let aValue: string | number | Date = '';
    let bValue: string | number | Date = '';

    switch (sortField) {
      case 'displayName':
        aValue = (a.displayName || '').toLowerCase();
        bValue = (b.displayName || '').toLowerCase();
        break;
      case 'email':
        aValue = a.email.toLowerCase();
        bValue = b.email.toLowerCase();
        break;
      case 'role':
        aValue = (a.role || '').toLowerCase();
        bValue = (b.role || '').toLowerCase();
        break;
      case 'access_rights':
        aValue = (a.access_rights || '').toLowerCase();
        bValue = (b.access_rights || '').toLowerCase();
        break;
      case 'kids_limit':
        aValue = a.kids_limit ?? -1;
        bValue = b.kids_limit ?? -1;
        break;
      case 'story_per_kid_limit':
        aValue = a.story_per_kid_limit ?? -1;
        bValue = b.story_per_kid_limit ?? -1;
        break;
      case 'createAt':
        aValue = new Date(a.createAt).getTime();
        bValue = new Date(b.createAt).getTime();
        break;
    }

    if (aValue < bValue) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 text-blue-600" /> : 
      <ChevronDown className="h-4 w-4 text-blue-600" />;
  };

  // Show loading while auth is initializing
  if (authLoading || checkingRole) {
    return (
      <>
        <Header />
        <div className="flex flex-col items-center justify-center min-h-screen pt-16">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600">{t.common.loading}</p>
        </div>
      </>
    );
  }

  // Show login prompt if not authenticated
  if (!currentUser) {
    return (
      <>
        <Header />
        <div className="flex flex-col items-center min-h-screen pt-16">
          <h1 className="text-2xl font-bold mb-4">{t.auth.loginRequiredShort}</h1>
          <Button 
            onClick={() => window.location.href = '/dashboard'}
            className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all px-8 py-6 text-lg"
          >
            {t.notFound.goToDashboard}
          </Button>
        </div>
      </>
    );
  }

  // Check if user has a role - if not, deny access
  if (!userAccountData?.role) {
    return (
      <>
        <Header />
        <div className="flex flex-col items-center min-h-screen pt-16">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md text-center">
            <svg 
              className="mx-auto h-12 w-12 text-red-500 mb-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
            <h1 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h1>
            <p className="text-red-700 mb-4">You do not have permission to access the admin panel. A role is required.</p>
            
            {/* Debug info */}
            <div className="mt-4 p-4 bg-gray-100 rounded text-left text-xs">
              <p className="font-semibold mb-2">Debug Info:</p>
              <p>User UID: {currentUser?.uid}</p>
              <p>Account Data Loaded: {userAccountData ? 'Yes' : 'No'}</p>
              <p>Role: {userAccountData?.role || 'No role found'}</p>
              <p>Email: {userAccountData?.email || currentUser?.email}</p>
            </div>

            <Button 
              onClick={() => window.location.href = '/dashboard'}
              className="mt-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all px-8 py-3"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 mt-16 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Panel - Accounts</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-gray-600">Your role:</span>
              <span className="inline-block px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full font-medium">
                {userAccountData?.role}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className={`${isLoading ? 'animate-spin' : ''} rounded-full`}
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading accounts...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No accounts found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th 
                      className="px-6 py-4 text-right text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('displayName')}
                    >
                      <div className="flex items-center justify-start gap-1">
                        <span>Name</span>
                        <SortIcon field="displayName" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-right text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center justify-start gap-1">
                        <span>Email</span>
                        <SortIcon field="email" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-right text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center justify-start gap-1">
                        <span>Role</span>
                        <SortIcon field="role" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-right text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('access_rights')}
                    >
                      <div className="flex items-center justify-start gap-1">
                        <span>Access Rights</span>
                        <SortIcon field="access_rights" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-right text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('kids_limit')}
                    >
                      <div className="flex items-center justify-start gap-1">
                        <span>Kids Limit</span>
                        <SortIcon field="kids_limit" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-right text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('story_per_kid_limit')}
                    >
                      <div className="flex items-center justify-start gap-1">
                        <span>Story/Kid Limit</span>
                        <SortIcon field="story_per_kid_limit" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-right text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('createAt')}
                    >
                      <div className="flex items-center justify-start gap-1">
                        <span>Created At</span>
                        <SortIcon field="createAt" />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedAccounts.map((account) => {
                    const isEditing = editingUid === account.uid;
                    
                    return (
                      <tr key={account.uid} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {account.displayName || <span className="text-gray-400 italic">No name</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {account.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {isEditing ? (
                            <select
                              value={editingRole}
                              onChange={(e) => setEditingRole(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select role</option>
                              <option value="admin">admin</option>
                              <option value="read">read</option>
                              <option value="write">write</option>
                            </select>
                          ) : (
                            account.role || <span className="text-gray-400 italic">No role</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {isEditing ? (
                            <select
                              value={editingAccessRights}
                              onChange={(e) => setEditingAccessRights(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select access right</option>
                              <option value="awaiting_approval">awaiting_approval</option>
                              <option value="approved">approved</option>
                            </select>
                          ) : (
                            account.access_rights ? (
                              <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                {account.access_rights}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">No access rights</span>
                            )
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editingKidsLimit ?? ''}
                              onChange={(e) => setEditingKidsLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                              placeholder="No limit"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            account.kids_limit !== undefined ? account.kids_limit : <span className="text-gray-400 italic">No limit</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editingStoryPerKidLimit ?? ''}
                              onChange={(e) => setEditingStoryPerKidLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                              placeholder="No limit"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            account.story_per_kid_limit !== undefined ? account.story_per_kid_limit : <span className="text-gray-400 italic">No limit</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(account.createAt).toLocaleDateString()} {new Date(account.createAt).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          {isEditing ? (
                            <div className="flex gap-2 justify-end">
                              <Button
                                onClick={() => handleSave(account.uid)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                Save
                              </Button>
                              <Button
                                onClick={handleCancel}
                                size="sm"
                                variant="outline"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleEdit(account)}
                              size="sm"
                              variant="outline"
                            >
                              Edit
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Total accounts: <span className="font-semibold">{accounts.length}</span>
        </div>
      </div>
    </>
  );
}

