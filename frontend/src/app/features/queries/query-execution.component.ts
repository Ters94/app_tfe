import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {FormsModule} from "@angular/forms";
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

const PRODUCT_PORTFOLIO_MAP: Record<string, string[]> = {
  CO2:         ['CO2_BE', 'CO2_EU'],
  GAS:         ['Gas_BE', 'Gas_FR', 'Gas_NL'],
  OIL:         ['Oil_BE', 'Oil_FR'],
  ELECTRICITY: ['Elec_BE', 'Elec_FR', 'Elec_NL'],
};

@Component({
  selector: 'app-query-execution',
  standalone: true,
 imports: [CommonModule, FormsModule],
  templateUrl: './query-execution.component.html',
  styleUrls: ['./query-execution.component.css']
})
export class QueryExecutionComponent  implements OnInit {
queryId: string ='';
query: any = null;
results: any[] = [];
groupId: string = '';
newQueryName: string = '';
groups: any[] = [];
selectedGroupId: string = '';
showCreateForm: boolean = false;
statistics: any = null;
errorMessage: string = '';
successMessage: string = '';
isAdmin: boolean = localStorage.getItem('role') === 'ADMIN';
 dataFields: string[] = [
  'TradeDate',
  'DealId',
  'Portfolio',
  'Desk',
  'Entity',
  'Direction',
  'Quantity',
  'QuantityUnit',
  'DeliveryPoint',
  'TransportCorridor',
  'DeliveryType',
  'DealType',
  'TraderCode',
  'Price',
  'Cash',
  'OpenQuantity',
  'BookingStatus',
  'MarginCost',
  'TotalMarginCost',
  'BusinessUnit',
  'CounterpartyName'
];

dealFilters: any = {
  portfolio: '',
  product: '',
  deal_type: '',
  trader_code: '',
   start_date: '',
  end_date: '',
  price_min: '',
  price_max: ''
};

dealsResults: any[] = [];
dealsCount = 0;

selectedDataFields: any = {
  TradeDate:         true,
  DealId:            true,
  Portfolio:         true,
  Desk:              false,
  Entity:            true,
  Direction:         false,
  Quantity:          true,
  QuantityUnit:      false,
  DeliveryPoint:     false,
  TransportCorridor: false,
  DeliveryType:      false,
  DealType:          true,
  TraderCode:        false,
  Price:             true,
  Cash:              false,
  OpenQuantity:      false,
  BookingStatus:     false,
  MarginCost:        false,
  TotalMarginCost:   false,
  BusinessUnit:      false,
  CounterpartyName:  true
};
filterOptions: any = {
  portfolio: [],
  product: [],
  deal_type: [],
  trader_code: [],
  counterparty_name: [],
  business_unit: [],
  delivery_point: [],
  booking_status: []
};

today: string = new Date().toISOString().split('T')[0];
originalProduct: string = '';

get filteredPortfolios(): string[] {
  const product = this.originalProduct || this.dealFilters.product;
  if (!product) return this.filterOptions.portfolio || [];
  return PRODUCT_PORTFOLIO_MAP[product] || [];
}

constructor(
  private http: HttpClient,
  private router: Router,
  private route: ActivatedRoute) {}


  ngOnInit() {
    if (this.isAdmin) {
      this.router.navigate(['/queries']);
      return;
    }
    this.queryId = this.route.snapshot.paramMap.get('id') || '';
    this.loadGroups();
    this.loadFilterOptions();
    this.loadQuery();
  }

   getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    };
  }
  getGroupName(groupId: string): string {
  const group = this.groups.find(g => g._id === groupId || g.id === groupId);
  return group ? group.name : '—';

}



loadFilterOptions(): void {
  this.http.get<any>(
    'http://127.0.0.1:8000/deals/filter-options',
    this.getHeaders()
  ).subscribe({
    next: (data) => {
      this.filterOptions = data;
    },
    error: () => {
          this.errorMessage = 'Erreur lors du chargement des options de filtres.';
        }
  });
}

searchDeals(): void {
  const cleanFilters: any = {};

Object.keys(this.dealFilters).forEach(key => {
  const value = this.dealFilters[key];
  if (value !== '' && value !== null) {
    cleanFilters[key] = value;
  }
});

  this.http.get<any>(
    'http://127.0.0.1:8000/deals/search',
    {
      ...this.getHeaders(),
      params: cleanFilters
    }
  ).subscribe({
    next: (response) => {
      const results = response.results || [];
results.sort((a: any, b: any) => {
  const da = a.trade_date || '';
  const db = b.trade_date || '';
  if (da !== db) return da < db ? -1 : 1;
  return (a.deal_id || '') < (b.deal_id || '') ? -1 : 1;
});
this.dealsResults = results;
      this.dealsCount = response.count || 0;
    },
    error: () => {
      this.errorMessage = 'Erreur lors de la recherche des deals.';
    }
  });
}



deleteQuery(id: string) {
  this.http.delete(`http://127.0.0.1:8000/queries/${id}`, this.getHeaders())
    .subscribe(() => {
      this.router.navigate(['/queries']);
    });
}
  loadGroups() {
    this.http.get<any[]>('http://127.0.0.1:8000/groups/', this.getHeaders())
      .subscribe({
        next: (data) => {
          this.groups = data;
        },
        error: () => {
          this.errorMessage = 'Erreur lors du chargement des groupes.';
        }
      });
  }
   loadQuery() {
     this.http.get<any>(
    `http://127.0.0.1:8000/queries/${this.queryId}`,
    this.getHeaders()
  ).subscribe({
    next: (data) => {
      this.query = data;

    this.dealFilters = { ...this.dealFilters, ...(data.filters || {}) };
    this.selectedGroupId = data.group_id;
    this.originalProduct = data.filters?.product || '';
    if (data.selected_fields) {
      this.selectedDataFields = data.selected_fields;
    }
    this.selectedDataFields['TradeDate'] = true;
    },
    error: (err) => {
      this.errorMessage = 'Erreur lors du chargement de la requête.';
    }
  });
}

  executeQuery(queryId: string) {
  this.http.get<any>(
    `http://127.0.0.1:8000/queries/${queryId}/execute`,
    this.getHeaders()
  ).subscribe({
    next: (res) => {
      const results = res.results || [];
    results.sort((a: any, b: any) => {
  const da = a.trade_date || '';
  const db = b.trade_date || '';
  if (da !== db) return da < db ? -1 : 1;
  return (a.deal_id || '') < (b.deal_id || '') ? -1 : 1;
    });
  this.results = results;

      this.statistics = {
        results_count: res.results_count,
        total_volume: res.total_volume,
        total_amount: res.total_amount,
        average_price: res.average_price
      };
    },
    error: () => {
      this.errorMessage = 'Erreur lors de l’exécution de la requête.';
    }
  });
}
  startEdit() {
  this.showCreateForm = true;

   this.newQueryName = this.query.query_name;
  this.selectedGroupId = this.query.group_id;
  this.dealFilters = this.query.filters || this.dealFilters;

  if (this.query.selected_fields) {
    this.selectedDataFields = this.query.selected_fields;
  }
  this.originalProduct = this.query.filters?.product || '';
  this.selectedDataFields['TradeDate'] = true;

}
updateQuery() {
  const cleanFilters: any = {};
  if (this.originalProduct) cleanFilters['product'] = this.originalProduct;

  Object.keys(this.dealFilters).forEach(key => {
    const value = this.dealFilters[key];

    if (value !== null && value !== '') {
      cleanFilters[key] = value;
    }
  });

  const body = {
    query_name: this.newQueryName.trim(),
    filters: cleanFilters,
    group_id: this.selectedGroupId,
    selected_fields: this.selectedDataFields
  };


    this.errorMessage = '';
    this.successMessage = '';
  this.http.put(
    `http://127.0.0.1:8000/queries/${this.queryId}`,
    body,
    this.getHeaders()
  ).subscribe({
    next: () => {
      this.showCreateForm = false;
      this.loadQuery();
    },
   error: (err) => {
          if (err.status === 0) {
            this.errorMessage = 'Backend inaccessible ou problème CORS.';
          } else {
            this.errorMessage = err.error?.detail || 'Erreur lors de la modification.';
          }
        }
      });
  }
 goBack(): void {
  const groupId = this.query?.group_id || this.selectedGroupId;
  this.router.navigate(['/groups', groupId]);
}
}
