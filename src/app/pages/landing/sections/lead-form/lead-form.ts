import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../../shared/icon/icon';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'app-lead-form',
  imports: [ReactiveFormsModule, RouterLink, Icon],
  templateUrl: './lead-form.html',
  styleUrl: './lead-form.css',
})
export class LeadForm {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  protected readonly state = signal<SubmitState>('idle');
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    company: ['', [Validators.required]],
    message: [''],
    consent: [false, [Validators.requiredTrue]],
    // Honeypot field: hidden from real visitors via CSS, left empty by humans.
    // Bots that auto-fill every field will trip this and get silently rejected server-side.
    website: [''],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.state.set('submitting');
    this.errorMessage.set('');

    this.http.post('/api/leads', this.form.getRawValue()).subscribe({
      next: () => {
        this.state.set('success');
        this.form.reset({
          name: '',
          email: '',
          company: '',
          message: '',
          consent: false,
          website: '',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.state.set('error');
        this.errorMessage.set(
          err.error?.message ?? 'Something went wrong. Please try again in a moment.',
        );
      },
    });
  }

  submitAnother(): void {
    this.state.set('idle');
  }
}
