import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-groups',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './groups.component.html',
  styleUrls: ['./groups.component.css']
})
export class GroupsComponent implements OnInit {
  groups: any[] = [];
  users: any[] = [];

  myOwnedGroups: any[] = [];
  myMemberGroups: any[] = [];

  searchTerm: string = '';
  errorMessage: string = '';
  successMessage: string = '';

  showForm: boolean = false;
  isEdit: boolean = false;
  selectedGroupId: string | null = null;

  showMyGroups: boolean = false;
  selectedGroupRole: 'OWNER' | 'MEMBER' = 'OWNER';

  confirmDeleteGroupId: string | null = null;
  group: any = {
    name: '',
    description: '',
    owner_id: ''
  };

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadGroups();

    if (this.isAdmin()) {
      this.loadUsers();
    }
  }

  get role(): string {
    return localStorage.getItem('role') || '';
  }

  get currentUserId(): string {
    return localStorage.getItem('user_id') || '';
  }

  isAdmin(): boolean {
    return this.role === 'ADMIN';
  }

  loadGroups(): void {
    this.http.get('/api/groups/').subscribe({
      next: (res: any) => {
        this.groups = res;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du chargement des groupes';
      }
    });
  }

  loadMyGroups(): void {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;

    this.http.get<any>(`/api/users/${userId}/groups`).subscribe({
      next: (res) => {
        this.myOwnedGroups = res.owned_groups || [];
        this.myMemberGroups = res.member_groups || [];
      },
      error: (err) => {
        this.errorMessage = err.error?.detail || 'Erreur lors du chargement de mes groupes';
      }
    });
  }

  showAllGroups(): void {
    this.showMyGroups = false;
    this.clearMessages();
  }

  showMyOwnedGroups(): void {
    this.showMyGroups = true;
    this.selectedGroupRole = 'OWNER';
    this.clearMessages();
    this.loadMyGroups();
  }

  showMyMemberGroups(): void {
    this.showMyGroups = true;
    this.selectedGroupRole = 'MEMBER';
    this.clearMessages();
    this.loadMyGroups();
  }

  get displayedGroups(): any[] {
    if (!this.showMyGroups) {
      return this.groups;
    }

    return this.selectedGroupRole === 'OWNER'
      ? this.myOwnedGroups
      : this.myMemberGroups;
  }

  get filteredDisplayedGroups(): any[] {
    const term = this.searchTerm.toLowerCase().trim();

    if (!term) {
      return this.displayedGroups;
    }

    return this.displayedGroups.filter(group =>
      (group.name || '').toLowerCase().includes(term) ||
      (group.description || '').toLowerCase().includes(term) ||
      (group.owner_username || '').toLowerCase().includes(term) ||
      (group.owner_id || '').toLowerCase().includes(term)
    );
  }

  canEdit(group: any): boolean {
    return this.role === 'ADMIN' || group.owner_id === this.currentUserId;
  }

  openCreateForm(): void {
    this.showForm = true;
    this.isEdit = false;
    this.selectedGroupId = null;

    this.group = {
      name: '',
      description: '',
      owner_id: ''
    };

    this.clearMessages();
  }

  openEditForm(group: any): void {
    this.showForm = true;
    this.isEdit = true;
    this.selectedGroupId = group.id;

    this.group = {
      name: group.name,
      description: group.description || '',
      owner_id: group.owner_id || ''
    };

    this.clearMessages();
  }

  saveGroup(): void {
    this.clearMessages();

    if (!this.group.name || this.group.name.trim() === '') {
      this.errorMessage = 'Le nom du groupe est obligatoire';
      return;
    }

    if (!this.isEdit && this.isAdmin() && !this.group.owner_id) {
      this.errorMessage = 'Veuillez sélectionner un owner';
      return;
    }

    const payload = {
      name: this.group.name,
      description: this.group.description,
      owner_id: this.group.owner_id || null
    };

    if (this.isEdit && this.selectedGroupId) {
      this.http.put(`/api/groups/${this.selectedGroupId}`, payload).subscribe({
        next: () => {
          this.successMessage = 'Groupe modifié avec succès';
          this.showForm = false;
          this.loadGroups();
          this.loadMyGroups();
        },
        error: (err) => {
          this.errorMessage = err?.error?.detail || 'Erreur lors de la modification du groupe';
        }
      });
    } else {
      this.http.post('/api/groups/', payload).subscribe({
        next: () => {
          this.successMessage = 'Groupe créé avec succès';
          this.showForm = false;
          this.loadGroups();
          this.loadMyGroups();
        },
        error: (err) => {
          this.errorMessage = err?.error?.detail || 'Erreur lors de la création du groupe';
        }
      });
    }
  }

  askDeleteGroup(groupId: string): void {
    this.clearMessages();
    this.confirmDeleteGroupId = groupId;
  }

  cancelDeleteGroup(): void {
    this.confirmDeleteGroupId = null;
  }

  confirmDeleteGroup(): void {
    if (!this.confirmDeleteGroupId) return;

    this.http.delete(`/api/groups/${this.confirmDeleteGroupId}`).subscribe({
      next: () => {
        this.confirmDeleteGroupId = null;
        this.successMessage = 'Groupe désactivé avec succès';
        this.loadGroups();
        this.loadMyGroups();
      },
      error: (err) => {
        this.confirmDeleteGroupId = null;
        this.errorMessage = err?.error?.detail || 'Erreur lors de la désactivation du groupe';
      }
    });
  }

  loadUsers(): void {
    this.http.get('/api/users/').subscribe({
      next: (res: any) => {
        this.users = res;
      },
      error: () => {
        this.users = [];
      }
    });
  }

  viewGroup(group: any): void {
    this.router.navigate(['/groups', group.id]);
  }

  cancelForm(): void {
    this.showForm = false;
    this.isEdit = false;
    this.selectedGroupId = null;

    this.group = {
      name: '',
      description: '',
      owner_id: ''
    };

    this.clearMessages();
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

}

