import React, { useState } from 'react';
import LoginForm from '../../components/auth/LoginForm';
import RegisterForm from '../../components/auth/RegisterForm';
import styled from 'styled-components';

const AuthContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: #f5f5f5;
`;

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <AuthContainer>
      {isLogin ? (
        <LoginForm onRegisterClick={() => setIsLogin(false)} />
      ) : (
        <RegisterForm onLoginClick={() => setIsLogin(true)} />
      )}
    </AuthContainer>
  );
};

export default AuthPage;