import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-group-detail',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.css']
})
export class GroupDetailComponent implements OnInit {
  groupId: string | null = null;
  group: any = {};
  members: any[] = [];
  users: any[] = [];

  role: string = '';
  currentUserId: string = '';
 
  selectedUserId: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  groupQueries: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.groupId = this.route.snapshot.paramMap.get('id');
    this.role = localStorage.getItem('role') || '';
    this.currentUserId = localStorage.getItem('user_id') || '';

    if (!this.groupId) {
      this.router.navigate(['/groups']);
      return;
    }

    this.loadGroup();
    this.loadMembers();
    this.loadUsers();
  }

  canManageMembers(group: any): boolean {
    return this.role === 'ADMIN' || this.group.owner_id === this.currentUserId;
  }

goToCreateQuery() {
  this.router.navigate(['/queries/create'], {
    queryParams: { groupId: this.groupId }
  });
}
  loadGroup(): void {
    this.http.get(`/api/groups/${this.groupId}`).subscribe({
      next: (res: any) => {
        this.group = res;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.detail || 'Erreur lors du chargement du groupe';
      }
    });
  }


editGroupPage(): void {
  this.router.navigate(['/groups/edit', this.groupId]);
}
  loadMembers(): void {
    this.http.get(`/api/groups/${this.groupId}/members`).subscribe({
      next: (res: any) => {
        this.members = res;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.detail || 'Erreur lors du chargement des membres';
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

  addMember(): void {
    if (!this.selectedUserId) {
      this.errorMessage = 'Veuillez sélectionner un utilisateur';
      return;
    }

    const payload = {
      user_id: this.selectedUserId,
      role: 'MEMBER'
    };

    this.http.post(`/api/groups/${this.groupId}/members`, payload).subscribe({
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

  removeMember(member: any): void {
    const confirmed = confirm('Voulez-vous supprimer ce membre du groupe ?');
    if (!confirmed) return;

    this.http.delete(`/api/groups/${this.groupId}/members/${member.id}`).subscribe({
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
  viewUser(member: any): void {
  if (!member.user_id) {
    this.errorMessage = "Utilisateur introuvable";
    return;
  }

  this.router.navigate(['/users', member.user_id]);
}

loadGroupQueries() {
  this.http.get<any[]>(`/api/queries/group/${this.groupId}`).subscribe({
    next: (data) => {
      this.groupQueries = data;
    },
    error: (err) => {
      this.errorMessage = err.error?.detail || 'Erreur chargement queries';
    }
  });
}

transferOwner(newOwnerId: string) {
  if (!confirm('Transférer le rôle d’owner à ce membre ?')) return;

  this.http.put(`/api/groups/${this.groupId}/transfer-owner?new_owner_id=${newOwnerId}`, {}).subscribe({
    next: () => {
      this.successMessage = 'Ownership transféré avec succès';
      this.loadGroup();
      this.loadMembers();
    },
    error: (err) => {
      this.errorMessage = err.error?.detail || 'Erreur transfert owner';
    }
  });
}
executeQuery(queryId: string) {
  this.router.navigate(['/queries', queryId]);
}

editQuery(queryId: string) {
  this.router.navigate(['/queries', queryId]);
}

deleteQuery(queryId: string) {
  if (!confirm('Supprimer cette query ?')) return;

  this.http.delete(`/api/queries/${queryId}`).subscribe({
      next: () => this.loadGroupQueries(),
      error: (err) => this.errorMessage = err.error?.detail || 'Erreur suppression query'
    });
}
  goBack(): void {
    this.router.navigate(['/groups']);
  }
}

