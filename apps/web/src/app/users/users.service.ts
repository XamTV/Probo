import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { AccountState, CreateUserInput, UpdateUserInput, UserRole } from '@probo/shared';
import { firstValueFrom } from 'rxjs';

/**
 * An account as the API returns it.
 *
 * There is no password field of any kind: the server exposes the state it
 * derives from the row, never the hash, and never whether one exists in
 * clearer terms than `state` already says.
 */
export interface AccountView {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  state: AccountState;
  lastLoginAt: string | null;
  createdAt: string;
  invitationExpiresAt: string | null;
}

/** What creating an account, or reissuing a link, hands back exactly once. */
export interface IssuedInvitation {
  invitationToken: string;
  invitationExpiresAt: string;
}

export type CreatedAccount = AccountView & IssuedInvitation;

/** US-02 — the team's accounts, over HTTP. */
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  list(): Promise<AccountView[]> {
    return firstValueFrom(this.http.get<AccountView[]>('/api/users'));
  }

  create(input: CreateUserInput): Promise<CreatedAccount> {
    return firstValueFrom(this.http.post<CreatedAccount>('/api/users', input));
  }

  /** A new link for an account whose own expired or was lost. */
  invite(id: string): Promise<IssuedInvitation> {
    return firstValueFrom(this.http.post<IssuedInvitation>(`/api/users/${id}/invitation`, {}));
  }

  update(id: string, input: UpdateUserInput): Promise<AccountView> {
    return firstValueFrom(this.http.patch<AccountView>(`/api/users/${id}`, input));
  }

  /**
   * The link an administrator copies and passes on.
   *
   * Built here from the current origin rather than sent by the server: the API
   * has no idea which host the browser reached it through, and guessing one
   * would produce a link that works nowhere.
   */
  invitationLink(token: string): string {
    return new URL(`/invitation/${token}`, window.location.origin).toString();
  }
}
