import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-group-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './group-form.component.html',
  styleUrl: './group-form.component.css'
})
export class GroupFormComponent implements OnInit {

  errorMessage: string = '';
  successMessage: string = '';

  groupId: string | null = null;

  group: any = {
    name: '',
    description: '',
    owner_id: ''
  };

  users: any[] = [];
  members: any[] = [];
  selectedUserId: string = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.groupId = this.route.snapshot.paramMap.get('id');

    if (!this.groupId) {
      this.errorMessage = 'Aucun groupe sélectionné';
      return;
    }

    this.loadGroup();
    this.loadUsers();
    this.loadMembers();
  }

  loadGroup(): void {
    const token = localStorage.getItem('token');

    this.http.get(`http://localhost:8000/groups/${this.groupId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.group = res;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Erreur lors du chargement du groupe';
      }
    });
  }

  saveGroup(): void {
    const token = localStorage.getItem('token');

    if (!token) {
      this.router.navigate(['/']);
      return;
    }

    this.clearMessages();

    if (!this.group.name || this.group.name.trim() === '') {
      this.errorMessage = 'Le nom du groupe est obligatoire';
      return;
    }

    const payload = {
      name: this.group.name,
      description: this.group.description
    };

    this.http.put(`http://localhost:8000/groups/${this.groupId}`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.successMessage = 'Groupe modifié avec succès';
        this.loadGroup();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.detail || 'Erreur lors de la modification du groupe';
      }
    });
  }

  loadUsers(): void {
    const token = localStorage.getItem('token');

    this.http.get('http://localhost:8000/users/', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.users = res;
      },
      error: () => {
        this.users = [];
      }
    });
  }

  addMember(): void {
    if (!this.selectedUserId) {
      this.errorMessage = 'Veuillez sélectionner un utilisateur';
      return;
    }

    const token = localStorage.getItem('token');

    const payload = {
      user_id: this.selectedUserId,
      role: 'MEMBER'
    };

    this.http.post(`http://localhost:8000/groups/${this.groupId}/members`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.successMessage = 'Membre ajouté avec succès';
        this.errorMessage = '';
        this.selectedUserId = '';
        this.loadMembers();
      },
      error: (err) => {
        console.error(err);
        this.successMessage = '';
        this.errorMessage = err?.error?.detail || 'Erreur lors de l’ajout du membre';
      }
    });
  }

  loadMembers(): void {
    const token = localStorage.getItem('token');

    this.http.get<any[]>(`http://localhost:8000/groups/${this.groupId}/members`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.members = data;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Erreur lors du chargement des membres';
      }
    });
  }

  get role(): string {
    return localStorage.getItem('role') || '';
  }

  get currentUserId(): string {
    return localStorage.getItem('userId') || '';
  }

  canManageMembers(group: any): boolean {
    return this.role === 'ADMIN' || group.owner_id === this.currentUserId;
  }

  goBack(): void {
    this.router.navigate(['/groups']);
  }
 viewUser(member: any): void {
  if (!member.user_id) {
    this.errorMessage = "Utilisateur introuvable";
    return;
  }

  this.router.navigate(['/users', member.user_id]);
}
 removeMember(member: any): void {
    const confirmed = confirm('Voulez-vous supprimer ce membre du groupe ?');
    if (!confirmed) return;

    const token = localStorage.getItem('token');

    this.http.delete(`http://localhost:8000/groups/${this.groupId}/members/${member.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.successMessage = 'Membre supprimé avec succès';
        this.errorMessage = '';
        this.loadMembers();
      },
      error: (err) => {
        console.error(err);
        this.successMessage = '';
        this.errorMessage = err?.error?.detail || 'Erreur lors de la suppression du membre';
      }
    });
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    this.router.navigate(['/']);
  }
}