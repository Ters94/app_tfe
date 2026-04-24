import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-user-form',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css']
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
  fieldErrors: any = {};
  submitted: boolean = false;

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

  validateForm(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    if (!this.user.lastname || this.user.lastname.trim() === '') {
      this.fieldErrors.lastname = 'Le nom est obligatoire';
      isValid = false;
    }

    if (!this.user.name || this.user.name.trim() === '') {
      this.fieldErrors.name = 'Le prénom est obligatoire';
      isValid = false;
    }

    if (!this.user.username || this.user.username.trim() === '') {
      this.fieldErrors.username = 'Le username est obligatoire';
      isValid = false;
    }

    if (!this.user.email || this.user.email.trim() === '') {
      this.fieldErrors.email = 'L’email est obligatoire';
      isValid = false;
    } else if (!this.isValidEmail(this.user.email)) {
      this.fieldErrors.email = 'Veuillez entrer une adresse email valide';
      isValid = false;
    }

    if (!this.user.phone || this.user.phone.trim() === '') {
      this.fieldErrors.phone = 'Le téléphone est obligatoire';
      isValid = false;
    } else if (!this.isValidPhone(this.user.phone)) {
      this.fieldErrors.phone = 'Numéro de téléphone invalide';
      isValid = false;
    }

    if (!this.isEdit && (!this.user.password || this.user.password.trim() === '')) {
      this.fieldErrors.password = 'Le mot de passe est obligatoire';
      isValid = false;
    }

    return isValid;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone: string): boolean {
    const cleanedPhone = phone.replace(/[\s.-]/g, '');
    const phoneRegex = /^(\+?\d{1,3})?[0-9]{9,12}$/;
    return phoneRegex.test(cleanedPhone);
  }

  cleanPhone(): void {
    if (this.user.phone) {
      this.user.phone = this.user.phone.replace(/[^0-9+]/g, '');
    }
  }

  handleBackendErrors(err: any): void {
    this.fieldErrors = {};

    if (err.status === 422 && Array.isArray(err.error?.detail)) {
      err.error.detail.forEach((e: any) => {
        const field = e.loc[e.loc.length - 1];

        let message = e.msg;

        if (message.includes('valid email')) {
          message = 'Veuillez entrer une adresse email valide';
        }

        if (message.includes('String should match pattern') || message.includes('pattern')) {
          message = 'Numéro de téléphone invalide';
        }

        if (message.includes('field required') || message.includes('Field required')) {
          message = 'Ce champ est obligatoire';
        }

        this.fieldErrors[field] = message;
      });

      this.errorMessage = 'Veuillez corriger les erreurs du formulaire';
    } else if (typeof err?.error?.detail === 'string') {
      this.errorMessage = err.error.detail;
    } else {
      this.errorMessage = 'Une erreur est survenue';
    }
  }

  generateUsername(): void {
    if (this.user.lastname && this.user.name) {
      const lastnamePart = this.user.lastname
        .trim()
        .substring(0, 2)
        .toLowerCase();

      const namePart = this.user.name
        .trim()
        .replace(/\s+/g, '')
        .toLowerCase();

      this.user.username = lastnamePart + namePart;
    }
  }

  saveUser(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.fieldErrors = {};

    this.generateUsername();

    if (!this.validateForm()) {
      return;
    }

    const token = localStorage.getItem('token');

    if (!token) {
      this.errorMessage = 'Session expirée, reconnecte-toi';
      this.router.navigate(['/']);
      return;
    }

    const payload: any = {
      lastname: this.user.lastname,
      name: this.user.name,
      username: this.user.username,
      email: this.user.email,
      phone: this.user.phone,
      address: this.user.address
    };

    if (this.user.password && this.user.password.trim() !== '') {
      payload.password = this.user.password;
    }

    if (this.isEdit) {
      this.http.put(`http://localhost:8000/users/${this.userId}`, payload, {
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
          this.handleBackendErrors(err);
        }
      });
    } else {
      if (!payload.password) {
        this.fieldErrors.password = 'Le mot de passe est obligatoire';
        return;
      }

      this.http.post('http://localhost:8000/users/', payload, {
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
          this.handleBackendErrors(err);
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }
}