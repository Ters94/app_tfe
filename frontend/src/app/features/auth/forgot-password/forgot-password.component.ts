import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  email = '';
  message = '';
  error = '';
  submitted = false;

  constructor(private http: HttpClient) {}

  submit(): void {
    this.error = '';
    this.message = '';

    if (!this.email || !this.email.trim()) {
      this.error = "L'adresse email est obligatoire";
      return;
    }

    this.http.post('/api/auth/forgot-password', { email: this.email }).subscribe({
      next: (res: any) => {
        this.submitted = true;
        this.message = res?.message || 'Si un compte existe, un email a été envoyé.';
      },
      error: () => {
        this.error = 'Une erreur est survenue, réessayez.';
      }
    });
  }
}
