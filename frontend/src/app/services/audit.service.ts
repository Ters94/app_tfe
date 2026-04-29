import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Audit {
  id: string;
  action: string;
  timestamp: string;
  target_type: string;
  target_id: string;
  target_label?: string;
  user_id: string;
  username?: string;
  group_id?: string;
  old_values?: any;
  new_values?: any;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
}



@Injectable({
  providedIn: 'root'
})
export class AuditService {

  private apiUrl = 'http://localhost:8000/audits';

  constructor(private http: HttpClient) {}

  getGroups(): Observable<Group[]> {
  const token = localStorage.getItem('token');

  return this.http.get<Group[]>('http://localhost:8000/groups/', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
getGroupAudits(groupId: string): Observable<Audit[]> {
  const token = localStorage.getItem('token');

  return this.http.get<Audit[]>(`${this.apiUrl}/groups/${groupId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}


}
