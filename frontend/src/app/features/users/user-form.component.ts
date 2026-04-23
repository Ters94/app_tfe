import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-user-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './user-form.component.html'
})
export class UserFormComponent implements OnInit {
  user: any = {
    lastname: '',
    name: '',
    username: '',
    email: '',
    phone: '',
    address: '',
    password: ''
  };

  isEdit: boolean = false;
  userId: string | null = null;
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');

    if (!token) {
      alert('Session expirée, reconnecte-toi');
      this.router.navigate(['/']);
      return;
    }

    this.userId = this.route.snapshot.paramMap.get('id');

    if (this.userId) {
      this.isEdit = true;
      this.loadUser();
    }
  }

  loadUser(): void {
    const token = localStorage.getItem('token');

    this.http.get(`http://localhost:8000/users/${this.userId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (res: any) => {
        this.user = {
          lastname: res.lastname || '',
          name: res.name || '',
          username: res.username || '',
          email: res.email || '',
          phone: res.phone || '',
          address: res.address || '',
          password: ''
        };
      },
      error: (err: any) => {
        console.error(err);
        this.errorMessage = err?.error?.detail || 'Erreur lors du chargement de l’utilisateur';
      }
    });
  }

  generateUsername(): void {
    if (this.user.lastname && this.user.name) {
      const lastnamePart = this.user.lastname.trim().substring(0, 2).toLowerCase();
      const namePart = this.user.name.trim().replace(/\s+/g, '').toLowerCase();

      this.user.username = lastnamePart + namePart;
    }
  }

  saveUser(): void {
    const token = localStorage.getItem('token');

    if (!token) {
      this.errorMessage = 'Session expirée, reconnecte-toi';
      this.router.navigate(['/']);
      return;
    }

    this.errorMessage = '';
    this.generateUsername();

      const payload: any = {
      lastname: this.user.lastname,
      name: this.user.name,
      username: this.user.username,
      email: this.user.email,
      phone: this.user.phone,
      address: this.user.address
    };

    // On envoie le mot de passe seulement s'il existe
    if (this.user.password && this.user.password.trim() !== '') {
      payload.password = this.user.password;
    }
    if (this.isEdit) {
      this.http.put(`http://localhost:8000/users/${this.userId}`, this.user, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }).subscribe({
        next: () => {
          alert('Utilisateur modifié');
          this.router.navigate(['/users']);
        },
        error: (err: any) => {
          console.error(err);
          this.errorMessage = err?.error?.detail || 'Erreur lors de la modification';
        }
      });
    } else {
      if (!payload.password) {
        this.errorMessage = 'Le mot de passe est requis pour créer un utilisateur';
        return;
      }
      this.http.post('http://localhost:8000/users', this.user, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }).subscribe({
        next: () => {
          alert('Utilisateur créé');
          this.router.navigate(['/users']);
        },
        error: (err: any) => {
          console.error(err);
          this.errorMessage = err?.error?.detail || 'Erreur lors de la création';
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }
}