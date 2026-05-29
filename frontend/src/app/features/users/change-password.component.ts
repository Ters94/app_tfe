import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-change-password',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent {
  oldPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  errorMessage: string = '';
  successMessage: string = '';
  fieldErrors: any = {};

  constructor(private http: HttpClient, private router: Router) {}

  validateForm(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    if (!this.oldPassword.trim()) {
      this.fieldErrors.oldPassword = "L'ancien mot de passe est obligatoire";
      isValid = false;
    }

    if (!this.newPassword.trim()) {
      this.fieldErrors.newPassword = 'Le nouveau mot de passe est obligatoire';
      isValid = false;
    }

    if (this.newPassword && this.confirmPassword !== this.newPassword) {
      this.fieldErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      isValid = false;
    }

    return isValid;
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validateForm()) return;

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.put(
      '/api/users/me/change-password',
      { old_password: this.oldPassword, new_password: this.newPassword },
      { headers }
    ).subscribe({
      next: () => {
        this.successMessage = 'Mot de passe modifié avec succès.';
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        setTimeout(() => this.router.navigate(['/dashboard']), 1500);
      },
      error: (err: any) => {
        if (typeof err?.error?.detail === 'string') {
          this.errorMessage = err.error.detail;
        } else {
          this.errorMessage = 'Une erreur est survenue';
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
