import { Component } from '@angular/core';

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  initials: string;
}

@Component({
  selector: 'app-testimonials',
  imports: [],
  templateUrl: './testimonials.html',
  styleUrl: './testimonials.css',
})
export class Testimonials {
  protected readonly testimonials: Testimonial[] = [
    {
      quote:
        'Pulsegrid cut our weekly reporting time from two days to about ten minutes. Leadership finally sees the same numbers we do.',
      author: 'Jordan Lee',
      role: 'Head of Operations, Northwind Labs',
      initials: 'JL',
    },
    {
      quote:
        'The AI alerts caught a churn spike we would have missed for weeks. It paid for itself in the first month.',
      author: 'Priya Shah',
      role: 'VP of Growth, Brightline Co.',
      initials: 'PS',
    },
    {
      quote:
        'Setup took less than an hour, and the dashboards looked better than anything our previous BI tool produced.',
      author: 'Marcus Bennett',
      role: 'CTO, Fielder Systems',
      initials: 'MB',
    },
  ];
}
