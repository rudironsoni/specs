import { Component, input, output } from '@angular/core';

@Component({
  selector: 'legacy-secondary-button',
  standalone: true,
  template: `<button type="button"><ng-content></ng-content></button>`,
  styles: [`
    button {
      background: #1a73e8;
      border-radius: 4px;
    }
  `],
})
export class SecondaryButtonComponent {
  appearance = input<'primary' | 'secondary'>('secondary');
  disabled = input(false);
  pressed = output<void>();
}
