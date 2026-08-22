import { Component } from '@angular/core';

/** @deprecated use PrimaryButtonComponent */
@Component({
  selector: 'legacy-old-button',
  standalone: true,
  template: `<button type="button"><ng-content></ng-content></button>`,
})
export class OldButtonComponent {}
