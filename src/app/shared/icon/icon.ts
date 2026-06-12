import { Component, input } from '@angular/core';

export type IconName =
  | 'activity'
  | 'menu'
  | 'close'
  | 'check'
  | 'chart'
  | 'sparkles'
  | 'link'
  | 'bell'
  | 'users'
  | 'shield'
  | 'chevron-down'
  | 'arrow-right';

@Component({
  selector: 'app-icon',
  imports: [],
  templateUrl: './icon.html',
  styleUrl: './icon.css',
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly iconClass = input('h-6 w-6');
}
