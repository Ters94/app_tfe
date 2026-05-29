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
  group: any = { name: '', description: '', owner_id: '' };
  users: any[] = [];
  members: any[] = [];
  selectedUserId: string = '';
  groupQueries: any[] = [];
  selectedUserToAdd: any = null;
memberSearchTerm: string = '';
get filteredUsersToAdd(): any[] {
  const term = this.memberSearchTerm.toLowerCase().trim();

  if (!term) {
    return [];
  }

  return this.users.filter(user =>
    (user.username || '').toLowerCase().includes(term) ||
    (user.name || '').toLowerCase().includes(term) ||
    (user.lastname || '').toLowerCase().includes(term) ||
    (user.email || '').toLowerCase().includes(term)
  );
}

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.groupId = this.route.snapshot.paramMap.get('id');
    if (!this.groupId) { this.errorMessage = 'Aucun groupe sélectionné'; return; }
    this.loadGroup();
    this.loadUsers();
    this.loadMembers();
    this.loadGroupQueries();
  }

 selectUserToAdd(user: any): void {
  this.selectedUserToAdd = user;
  this.selectedUserId = user.id;
  this.memberSearchTerm = `${user.username} - ${user.email}`;
}
  loadGroupQueries() {
    this.http.get<any[]>(`/api/queries/group/${this.groupId}`).subscribe({
      next: (data) => { this.groupQueries = data; },
      error: (err) => { this.errorMessage = err.error?.detail || 'Erreur chargement queries'; }
    });
  }

  transferOwner(newOwnerId: string) {
    if (!confirm("Transférer le rôle d'owner à ce membre ?")) return;
    this.http.put(`/api/groups/${this.groupId}/transfer-owner?new_owner_id=${newOwnerId}`, {}).subscribe({
      next: () => { this.successMessage = 'Ownership transféré avec succès'; this.loadGroup(); this.loadMembers(); },
      error: (err) => { this.errorMessage = err.error?.detail || 'Erreur transfert owner'; }
    });
  }

  executeQuery(queryId: string) { this.router.navigate(['/queries', queryId]); }
  editQuery(queryId: string) { this.router.navigate(['/queries', queryId]); }

  deleteQuery(queryId: string) {
    if (!confirm('Supprimer cette query ?')) return;
    this.http.delete(`/api/queries/${queryId}`).subscribe({
      next: () => this.loadGroupQueries(),
      error: (err) => { this.errorMessage = err.error?.detail || 'Erreur suppression query'; }
    });
  }

  loadGroup(): void {
    this.http.get(`/api/groups/${this.groupId}`).subscribe({
      next: (res: any) => { this.group = res; },
      error: (err) => { this.errorMessage = 'Erreur lors du chargement du groupe'; }
    });
  }

  saveGroup(): void {
    this.clearMessages();
    if (!this.group.name || this.group.name.trim() === '') {
      this.errorMessage = 'Le nom du groupe est obligatoire';
      return;
    }
    const payload = { name: this.group.name, description: this.group.description };
    this.http.put(`/api/groups/${this.groupId}`, payload).subscribe({
      next: () => { this.successMessage = 'Groupe modifié avec succès'; this.loadGroup(); },
      error: (err) => { this.errorMessage = err?.error?.detail || 'Erreur lors de la modification du groupe'; }
    });
  }

  loadUsers(): void {
    this.http.get('/api/users/').subscribe({
      next: (res: any) => { this.users = res; },
      error: () => { this.users = []; }
    });
  }

  addMember(): void {
    if (!this.selectedUserId) { this.errorMessage = 'Veuillez sélectionner un utilisateur'; return; }
    const payload = { user_id: this.selectedUserId, role: 'MEMBER' };
    this.http.post(`/api/groups/${this.groupId}/members`, payload).subscribe({
      next: () => {
        this.successMessage = 'Membre ajouté avec succès';
        this.errorMessage = '';
        this.selectedUserId = '';
        this.selectedUserToAdd = null;
        this.memberSearchTerm = '';
        this.loadMembers(); },
      error: (err) => { this.successMessage = ''; this.errorMessage = err?.error?.detail || "Erreur lors de l'ajout du membre"; }
    });
  }

  loadMembers(): void {
    this.http.get<any[]>(`/api/groups/${this.groupId}/members`).subscribe({
      next: (data) => { this.members = data; },
      error: () => { this.errorMessage = 'Erreur lors du chargement des membres'; }
    });
  }

  get role(): string { return localStorage.getItem('role') || ''; }
  get currentUserId(): string { return localStorage.getItem('user_id') || ''; }

  canManageMembers(group: any): boolean {
    return this.role === 'ADMIN' || group.owner_id === this.currentUserId;
  }

  goBack(): void { this.router.navigate(['/groups']); }

  viewUser(member: any): void {
    if (!member.user_id) { this.errorMessage = 'Utilisateur introuvable'; return; }
    this.router.navigate(['/users', member.user_id]);
  }

  removeMember(member: any): void {
    if (!confirm('Voulez-vous supprimer ce membre du groupe ?')) return;
    this.http.delete(`/api/groups/${this.groupId}/members/${member.id}`).subscribe({
      next: () => { this.successMessage = 'Membre supprimé avec succès'; this.errorMessage = ''; this.loadMembers(); },
      error: (err) => { this.successMessage = ''; this.errorMessage = err?.error?.detail || 'Erreur lors de la suppression du membre'; }
    });
  }

  clearMessages(): void { this.errorMessage = ''; this.successMessage = ''; }
}
