import React from 'react';
import styled from 'styled-components';

import Sidebar from "./Sidebar";
import { useAuth } from '../../contexts/AuthContext';

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: row-reverse;
  height: 100vh;
  background-color: ${props => props.theme.colors.background};
`;

const MainContent = styled.div`
  flex: 1;
  padding: 10px 15px 0;
`;


const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  return (
    <LayoutContainer>
      {isAuthenticated && <Sidebar />}
      <MainContent>
        {children}
      </MainContent>
    </LayoutContainer>
  );
};

export default Layout; 
