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
  onRegisterClick?: () => void;
}

const LoginForm: React.FC<Props> = ({ onRegisterClick }) => {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      router.push('/');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer>
      <FormTitle>התחברות</FormTitle>
      <Form onSubmit={handleSubmit}>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <FormGroup>
          <Label htmlFor="email">דוא"ל</Label>
          <Input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="password">סיסמה</Label>
          <Input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormGroup>
        <SubmitButton type="submit" disabled={loading}>
          {loading ? 'מתחבר...' : 'התחבר'}
        </SubmitButton>
      </Form>
      <LinkText>
        אין לך חשבון?{' '}
        <LinkButton type="button" onClick={onRegisterClick}>
          הירשם כאן
        </LinkButton>
      </LinkText>
    </FormContainer>
  );
};

export default LoginForm;