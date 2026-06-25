import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent {
  token = '';
  newPassword = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  fieldErrors: any = {};
  done = false;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.token = this.route.snapshot.paramMap.get('token') || '';
  }

  validate(): boolean {
    this.fieldErrors = {};
    let ok = true;

    if (this.newPassword.length < 6) {
      this.fieldErrors.newPassword = 'Au moins 6 caractères';
      ok = false;
    }

    if (this.confirmPassword !== this.newPassword) {
      this.fieldErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      ok = false;
    }

    return ok;
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validate()) return;

    this.http.post('/api/auth/reset-password', {
      token: this.token,
      new_password: this.newPassword
    }).subscribe({
      next: () => {
        this.done = true;
        this.successMessage = 'Mot de passe réinitialisé avec succès.';
        setTimeout(() => this.router.navigate(['/']), 1800);
      },
      error: (err: any) => {
        this.errorMessage = (typeof err?.error?.detail === 'string')
          ? err.error.detail
          : 'Une erreur est survenue';
      }
    });
  }
}
