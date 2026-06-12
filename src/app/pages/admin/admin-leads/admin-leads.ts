import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Icon } from '../../../shared/icon/icon';

interface LeadRow {
  id: number;
  name: string;
  email: string;
  company: string;
  message: string | null;
  consent: boolean;
  ipAddress: string | null;
  createdAt: string;
}

type LoadState = 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-admin-leads',
  imports: [RouterLink, Icon, DatePipe],
  templateUrl: './admin-leads.html',
  styleUrl: './admin-leads.css',
})
export class AdminLeads {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected readonly state = signal<LoadState>('loading');
  protected readonly leads = signal<LeadRow[]>([]);

  constructor() {
    this.fetchLeads();
  }

  fetchLeads(): void {
    this.state.set('loading');

    this.http.get<{ leads: LeadRow[] }>('/api/admin/leads').subscribe({
      next: ({ leads }) => {
        this.leads.set(leads);
        this.state.set('loaded');
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.router.navigateByUrl('/admin/login');
          return;
        }
        this.state.set('error');
      },
    });
  }

  logout(): void {
    this.http.post('/api/admin/logout', {}).subscribe({
      complete: () => this.router.navigateByUrl('/admin/login'),
    });
  }
}
