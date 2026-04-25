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
  searchTerm: string = '';
  errorMessage: string = '';
  successMessage: string = '';

  showForm: boolean = false;
  isEdit: boolean = false;
  selectedGroupId: string | null = null;

  group: any = {
    name: '',
    description: ''
  };

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadGroups();
  }

  loadGroups(): void {
    const token = localStorage.getItem('token');

    if (!token) {
      this.router.navigate(['/']);
      return;
    }

    this.http.get('http://localhost:8000/groups/', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (res: any) => {
        this.groups = res;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Erreur lors du chargement des groupes';
      }
    });
  }

  get filteredGroups() {
    return this.groups.filter(group =>
      (group.name || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      (group.description || '').toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  openCreateForm(): void {
    this.showForm = true;
    this.isEdit = false;
    this.selectedGroupId = null;
    this.group = {
      name: '',
      description: ''
    };
    this.clearMessages();
  }

  openEditForm(group: any): void {
    this.showForm = true;
    this.isEdit = true;
    this.selectedGroupId = group.id;

    this.group = {
      name: group.name,
      description: group.description || ''
    };

    this.clearMessages();
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

    if (this.isEdit && this.selectedGroupId) {
      this.http.put(`http://localhost:8000/groups/${this.selectedGroupId}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }).subscribe({
        next: () => {
          this.successMessage = 'Groupe modifié avec succès';
          this.showForm = false;
          this.loadGroups();
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = err?.error?.detail || 'Erreur lors de la modification du groupe';
        }
      });
    } else {
      this.http.post('http://localhost:8000/groups/', payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }).subscribe({
        next: () => {
          this.successMessage = 'Groupe créé avec succès';
          this.showForm = false;
          this.loadGroups();
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = err?.error?.detail || 'Erreur lors de la création du groupe';
        }
      });
    }
  }

  deleteGroup(groupId: string): void {
    const token = localStorage.getItem('token');

    if (!token) {
      this.router.navigate(['/']);
      return;
    }

    const confirmed = confirm('Voulez-vous vraiment désactiver ce groupe ?');
    if (!confirmed) return;

    this.clearMessages();

    this.http.delete(`http://localhost:8000/groups/${groupId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: () => {
        this.successMessage = 'Groupe désactivé avec succès';
        this.loadGroups();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.detail || 'Erreur lors de la désactivation du groupe';
      }
    });
  }

  viewGroup(group: any): void {
    alert(
      `Groupe : ${group.name}\nDescription : ${group.description || '-'}\nOwner ID : ${group.owner_id}`
    );
  }

  cancelForm(): void {
    this.showForm = false;
    this.isEdit = false;
    this.selectedGroupId = null;
    this.group = {
      name: '',
      description: ''
    };
    this.clearMessages();
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
