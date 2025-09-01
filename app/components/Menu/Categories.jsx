import React from 'react';
import { connect } from 'react-redux';
import Button from '@mui/material/Button';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import LocalDiningIcon from '@mui/icons-material/LocalDining';
import WineBarIcon from '@mui/icons-material/WineBar';
import CakeIcon from '@mui/icons-material/Cake';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import IcecreamIcon from '@mui/icons-material/Icecream';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import FastfoodIcon from '@mui/icons-material/Fastfood';

// Category colors for professional restaurant appearance
const getCategoryColor = (index, isSelected) => {
    const colors = [
        { bg: '#2563eb', text: '#ffffff', icon: '#e0f2fe' }, // Blue
        { bg: '#dc2626', text: '#ffffff', icon: '#ffebee' }, // Red 
        { bg: '#059669', text: '#ffffff', icon: '#e8f5e8' }, // Green
        { bg: '#ea580c', text: '#ffffff', icon: '#fff3e0' }, // Orange
        { bg: '#7c3aed', text: '#ffffff', icon: '#f3e8ff' }, // Purple
        { bg: '#0891b2', text: '#ffffff', icon: '#e0f7fa' }, // Cyan
        { bg: '#be185d', text: '#ffffff', icon: '#fce7f3' }, // Pink
        { bg: '#365314', text: '#ffffff', icon: '#f0fdf4' }  // Dark Green
    ];
    return colors[index % colors.length];
};

// Get category icon based on name
const getCategoryIcon = (categoryName) => {
    const name = categoryName.toLowerCase();
    if (name.includes('bebida') || name.includes('drink') || name.includes('bar')) return WineBarIcon;
    if (name.includes('postre') || name.includes('dessert') || name.includes('dulce')) return CakeIcon;
    if (name.includes('café') || name.includes('coffee')) return LocalCafeIcon;
    if (name.includes('helado') || name.includes('ice')) return IcecreamIcon;
    if (name.includes('entrada') || name.includes('appetizer')) return LunchDiningIcon;
    if (name.includes('rápida') || name.includes('fast')) return FastfoodIcon;
    if (name.includes('principal') || name.includes('main')) return LocalDiningIcon;
    return RestaurantMenuIcon; // Default
};

const Categories = ({ menu, selectedCategory, categories = [], onCategoryClick }) => {
    return (
        <div className="categories" style={{ padding: '12px 8px' }}>
            <div style={{ 
                fontSize: '18px', 
                fontWeight: '700', 
                color: '#374151',
                marginBottom: '16px',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            }}>
                📋 CATEGORÍAS
            </div>
            {categories.map((category, index) => {
                const isSelected = selectedCategory === category.name;
                const colorScheme = getCategoryColor(index, isSelected);
                const IconComponent = getCategoryIcon(category.name);
                
                return (
                    <Button
                        key={category.name}
                        className="categoryButton"
                        variant="contained"
                        startIcon={<IconComponent />}
                        onClick={() => onCategoryClick(category.name)}
                        sx={{
                            backgroundColor: isSelected ? colorScheme.bg : `${colorScheme.bg}20`,
                            color: isSelected ? colorScheme.text : colorScheme.bg,
                            border: `2px solid ${colorScheme.bg}`,
                            borderRadius: '16px',
                            padding: '16px 20px',
                            margin: '6px 4px',
                            minHeight: '64px',
                            fontSize: '16px',
                            fontWeight: '600',
                            textTransform: 'none',
                            boxShadow: isSelected ? 
                                `0 8px 24px ${colorScheme.bg}40` : 
                                `0 4px 12px ${colorScheme.bg}20`,
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                                backgroundColor: colorScheme.bg,
                                color: colorScheme.text,
                                transform: 'translateY(-2px)',
                                boxShadow: `0 12px 32px ${colorScheme.bg}40`
                            },
                            '& .MuiButton-startIcon': {
                                color: isSelected ? colorScheme.icon : colorScheme.bg,
                                fontSize: '24px'
                            },
                            lineHeight: '1.3',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word'
                        }}
                    >
                        {category.name}
                    </Button>
                );
            })}
        </div>
    );
};

const mapStateToProps = (state) => {
    // Handle both Immutable and plain object state - Force cache refresh
    const appState = state.app;
    let menu, selectedCategory, categories = [];
    
    if (appState && typeof appState.get === 'function') {
        // Immutable.js format
        menu = appState.get('menu');
        selectedCategory = appState.get('selectedCategory');
        // The menu itself might be a plain object stored in Immutable state
        categories = menu?.categories || [];
    } else if (appState && typeof appState === 'object') {
        // Plain object format
        menu = appState.menu;
        selectedCategory = appState.selectedCategory;
        categories = appState.menu?.categories || [];
    }
    
    return {
        menu,
        selectedCategory,
        categories
    };
};

export default connect(
    mapStateToProps
)(Categories);