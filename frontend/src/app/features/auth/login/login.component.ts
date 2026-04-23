import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {

  email = '';
  password = '';
  error = '';

  constructor(private http: HttpClient, private router: Router) {}

login() {
  const body = new URLSearchParams();
  body.set('username', this.email);
  body.set('password', this.password);

  this.http.post('http://localhost:8000/auth/login', body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }).subscribe({
    next: (res: any) => {
      console.log('TOKEN:', res.access_token); // debug

      localStorage.setItem('token', res.access_token); // ✅ stockage

      this.router.navigate(['/admin']);
    },
    error: () => {
      this.error = "Login failed";
    }
  });
}
}
