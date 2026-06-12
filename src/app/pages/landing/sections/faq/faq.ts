import { Component, signal } from '@angular/core';
import { Icon } from '../../../../shared/icon/icon';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-faq',
  imports: [Icon],
  templateUrl: './faq.html',
  styleUrl: './faq.css',
})
export class Faq {
  protected readonly openIndex = signal<number | null>(0);

  protected readonly items: FaqItem[] = [
    {
      question: 'What is Pulsegrid?',
      answer:
        'Pulsegrid is an AI-powered analytics platform that unifies your product, revenue, and customer data into real-time dashboards, so your team can spot trends and react faster.',
    },
    {
      question: 'How long does setup take?',
      answer:
        'Most teams connect their first data sources and have a working dashboard in under an hour, with no engineering work required.',
    },
    {
      question: 'Do you offer a free trial?',
      answer:
        'Yes. Every plan starts with a 14-day free trial and no credit card is required. Request a demo below and our team will help you get started.',
    },
    {
      question: 'Is my data secure?',
      answer:
        'Pulsegrid runs on SOC 2-ready infrastructure with encryption in transit and at rest, role-based access control, and full audit logs.',
    },
    {
      question: 'Can I cancel anytime?',
      answer:
        'Absolutely. There are no long-term contracts, and you can cancel or change your plan at any time from your account settings.',
    },
  ];

  toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? null : index));
  }
}
