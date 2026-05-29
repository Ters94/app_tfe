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

  private apiUrl = '/api/audits';

  constructor(private http: HttpClient) {}

  getGroups(): Observable<Group[]> {
    return this.http.get<Group[]>('/api/groups/');
  }

  getGroupAudits(groupId: string): Observable<Audit[]> {
    return this.http.get<Audit[]>(`${this.apiUrl}/groups/${groupId}`);
  }


}
