import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  ActivationBlocker,
  CampaignStatus,
  CreateCampaignInput,
  DocumentType,
  ExpectedDocumentType,
  ReferenceTextInput,
  UpdateCampaignInput,
} from '@probo/shared';
import { firstValueFrom } from 'rxjs';

/** A reference as the API returns it. The storage key never leaves the server. */
export interface ReferenceProfileView {
  id: string;
  documentType: DocumentType;
  text: string | null;
  fileName: string | null;
  updatedAt: string;
}

export interface CampaignView {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  expectedTypes: ExpectedDocumentType[];
  confidenceThreshold: number;
  relevanceWeight: number;
  clarityWeight: number;
  formalQualityWeight: number;
  opensAt: string | null;
  closesAt: string | null;
}

/** What a single campaign carries on read: its references and what blocks it. */
export interface CampaignDetail extends CampaignView {
  referenceProfiles: ReferenceProfileView[];
  activationBlockers: ActivationBlocker[];
}

/**
 * US-04, US-05, US-06, US-22 — campaigns, over HTTP.
 *
 * The blockers are not recomputed here. They arrive with the campaign, decided
 * by the same function the API enforces with, so the screen can never disagree
 * with the server about what "ready to activate" means.
 */
@Injectable({ providedIn: 'root' })
export class CampaignsService {
  private readonly http = inject(HttpClient);

  list(): Promise<CampaignView[]> {
    return firstValueFrom(this.http.get<CampaignView[]>('/api/campaigns'));
  }

  findOne(id: string): Promise<CampaignDetail> {
    return firstValueFrom(this.http.get<CampaignDetail>(`/api/campaigns/${id}`));
  }

  create(input: CreateCampaignInput): Promise<CampaignView> {
    return firstValueFrom(this.http.post<CampaignView>('/api/campaigns', input));
  }

  update(id: string, input: UpdateCampaignInput): Promise<CampaignDetail> {
    return firstValueFrom(this.http.patch<CampaignDetail>(`/api/campaigns/${id}`, input));
  }

  saveReference(id: string, input: ReferenceTextInput): Promise<ReferenceProfileView> {
    return firstValueFrom(
      this.http.put<ReferenceProfileView>(`/api/campaigns/${id}/references`, input),
    );
  }

  activate(id: string): Promise<CampaignView> {
    return firstValueFrom(this.http.post<CampaignView>(`/api/campaigns/${id}/activation`, {}));
  }
}
