import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  email = '';
  password = '';
  error = '';

  constructor(private http: HttpClient, private router: Router) {}

login() : void{
  this.error = '';
  const body = new URLSearchParams();
  body.set('username', this.email);
  body.set('password', this.password);

  this.http.post('http://localhost:8000/auth/login', body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }).subscribe({
    next: (res: any) => {
      const token = res.access_token;

      localStorage.setItem('token', token); //

      this.http.get('http://localhost:8000/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).subscribe({
        next: (user: any) => {
          localStorage.setItem('role', user.role);
          localStorage.setItem('username', user.username);
          localStorage.setItem('name', user.name);
          localStorage.setItem('user_id', user.id);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          console.error('Failed to fetch user info', err);
          this.error = 'impossible de récupérer les informations de l\'utilisateur';
        }
      });
    },
    error: (err) => {
      console.error('Login failed', err);
      this.error = "Login failed";
    }
  });
}
}
