import { Component } from '@angular/core';
import { Header } from '../../layout/header/header';
import { Footer } from '../../layout/footer/footer';
import { Hero } from './sections/hero/hero';
import { Features } from './sections/features/features';
import { HowItWorks } from './sections/how-it-works/how-it-works';
import { Testimonials } from './sections/testimonials/testimonials';
import { Faq } from './sections/faq/faq';
import { LeadForm } from './sections/lead-form/lead-form';

@Component({
  selector: 'app-landing',
  imports: [Header, Footer, Hero, Features, HowItWorks, Testimonials, Faq, LeadForm],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {}
