import React, {useEffect, useState} from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styled from 'styled-components';
import {
  FaBars,
  FaBuilding,
  FaSignOutAlt,
  FaUserTie
} from 'react-icons/fa';

import { useAuth } from '../../contexts/AuthContext';

const SidebarContainer = styled.div<{ isCollapsed: boolean }>`
  width: ${props => props.isCollapsed ? '60px' : '250px'};
  height: 100vh;
  background: #f5f5f5;
  color: #51789f;
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  direction: rtl;
  flex-shrink: 0;
  border-right: 1px solid #e0e0e0;
`;

const SidebarGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const SidebarItemHolder = styled.div<{ isActive: boolean }>`
  cursor: ${props => props.isActive ? 'default' : 'pointer'};
  height: 65px;
  display: flex;
  text-decoration: none;
  padding: 14px 0 14px 0;
  font-weight: ${props => props.isActive ? '600' : '400'};
  transition: all 0.2s ease;

  &:hover, &:focus {
    background-color: rgb(227, 237, 246);
  }
`;

const SidebarItemLabel = styled.span<{ isCollapsed: boolean; isActive: boolean }>`
  display: flex;
  align-items: center;
  text-decoration: none;
  font-weight: ${props => props.isActive ? '600' : '400'};
  font-size: 22px;
  border-radius: ${props => props.theme.borderRadius.small};
  background-color: 'transparent';
  visibility: ${props => (props.isCollapsed ? 'hidden' : 'visible')};
  transition: opacity 0.2s ease, visibility 0s linear ${props => (props.isCollapsed ? '0s' : '0.3s')};

  &:hover, &:focus {
    background-color: transparent;
  }
`;

const SidebarItemIcon = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-left: 15px;
  margin-right: 15px;
  font-size: 28px;
`;

const ToggleButtonHolder = styled.div`
  align-items: center;
  justify-content: right;
  display: flex;
  margin-top: 20px;
  margin-bottom: 10px;
  margin-right: 10px
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: #51789f;
  font-size: 28px;
  cursor: pointer;
  margin-bottom: 30px;
  transition: color 0.2s ease;
`;

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { logout, isAuthenticated } = useAuth();

  useEffect(() => {
    const stored = localStorage.getItem('sidebarCollapsed');
    if (stored !== null) {
      setIsCollapsed(JSON.parse(stored));
    }
  }, []);

  const router = useRouter();

  const isActive = (path: string) => router.pathname === path;

  const routes = [
    {'label': 'פרויקטים', 'icon': <FaBuilding/>, 'path': '/projects'},
    {'label': 'אנשי מקצוע', 'icon': <FaUserTie/>, 'path': '/professionals'},
  ]

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  return (
    <SidebarContainer isCollapsed={isCollapsed}>
      <SidebarGroup>
        <SidebarGroup>
          <ToggleButtonHolder>
            <ToggleButton onClick={() => setIsCollapsed(!isCollapsed)}>
              <FaBars/>
            </ToggleButton>
          </ToggleButtonHolder>
        </SidebarGroup>
        <SidebarGroup>
          <div style={{marginTop: '70px'}}>
            {routes.map((route, index) => (
              <Link key={index} href={route.path} passHref>
                <SidebarItemHolder isActive={isActive(route.path)}>
                  <SidebarItemIcon>
                    {route.icon}
                  </SidebarItemIcon>
                  <SidebarItemLabel isCollapsed={isCollapsed} isActive={isActive(route.path)}>
                    {route.label}
                  </SidebarItemLabel>
                </SidebarItemHolder>
              </Link>
            ))}
          </div>
        </SidebarGroup>
      </SidebarGroup>
      <SidebarGroup>
        {isAuthenticated && (
          <div style={{marginBottom: '30px', marginLeft: '10px', marginRight: '10px'}}>
            <SidebarItemHolder isActive={false} onClick={async () => { await logout(); router.push('/auth'); }}>
              <SidebarItemIcon>
                <FaSignOutAlt />
              </SidebarItemIcon>
                <SidebarItemLabel isCollapsed={isCollapsed} isActive={false}>
                  התנתק
              </SidebarItemLabel>
            </SidebarItemHolder>
          </div>
        )}
      </SidebarGroup>
    </SidebarContainer>
  );
};

export default Sidebar;
