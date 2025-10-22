import React, { useState } from 'react';
import { useRouter } from 'next/router';

import {
  ErrorMessage,
  Form,
  FormContainer,
  FormGroup,
  FormTitle,
  Input,
  Label,
  LinkButton,
  LinkText,
  SubmitButton
} from './Components';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  onLoginClick?: () => void;
}

const RegisterForm: React.FC<Props> = ({ onLoginClick }) => {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      await register({ email, password, name });
      router.push('/');
    } catch (err) {
      setError('Registration failed. Email might already be registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer>
      <FormTitle>הרשמה</FormTitle>
      <Form onSubmit={handleSubmit}>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <FormGroup>
          <Label htmlFor="name">שם</Label>
          <Input
            type="text"
            id="name"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            required
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="email">דוא"ל</Label>
          <Input
            type="email"
            id="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="password">סיסמה</Label>
          <Input
            type="password"
            id="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="confirmPassword">אימות סיסמה</Label>
          <Input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </FormGroup>
        <SubmitButton type="submit" disabled={loading}>
          {loading ? 'נרשם...' : 'הרשם'}
        </SubmitButton>
      </Form>
      <LinkText>
        כבר יש לך חשבון?{' '}
        <LinkButton type="button" onClick={onLoginClick}>
          היכנס כאן
        </LinkButton>

      </LinkText>
    </FormContainer>
  );
};

export default RegisterForm;