import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="app-footer">
      <span>&copy; {{ currentYear }} Employee Management System | Built with Angular 17 &amp; Spring Boot</span>
    </footer>
  `,
  styles: [`
    .app-footer {
      padding: 12px 24px;
      text-align: center;
      background: #f5f5f5;
      border-top: 1px solid #e0e0e0;
      color: #999;
      font-size: 0.85rem;
    }
  `],
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}
