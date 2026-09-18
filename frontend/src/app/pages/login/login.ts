import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.error.set(null);
    if (this.form.invalid) {
      this.error.set('Por favor, preencha o nome de usuário e a senha.');
      return;
    }
    this.isLoading.set(true);
    try {
      await this.auth.login(this.form.value.name!, this.form.value.password!);
      await this.router.navigate(['']);
    } catch {
      this.error.set('Nome de usuário ou senha incorretos.');
    } finally {
      this.isLoading.set(false);
    }
  }
}