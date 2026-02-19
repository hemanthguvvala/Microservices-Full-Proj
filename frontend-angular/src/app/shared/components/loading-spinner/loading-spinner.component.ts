import { Component, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    @if (loadingService.isLoading()) {
      <div class="loading-overlay">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    }
  `,
})
export class LoadingSpinnerComponent {
  loadingService = inject(LoadingService);
}
