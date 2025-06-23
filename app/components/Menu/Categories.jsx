import React from 'react';
import { connect } from 'react-redux';
import Button from '@mui/material/Button';

const Categories = ({ menu, selectedCategory, categories = [], onCategoryClick }) => {
    return (
        <div className="categories">
            {categories.map(category => (
                <Button
                    key={category.name}
                    className="categoryButton"
                    variant={selectedCategory === category.name ? 'contained' : 'outlined'}
                    style={{
                        color: category.foreground,
                        backgroundColor: category.color,
                        lineHeight: '1.3',
                        wordWrap: 'break-word',
                        whiteSpace: 'normal',
                        minHeight: '45px'
                    }}
                    onClick={() => onCategoryClick(category.name)}
                >
                    {selectedCategory === category.name ? 
                        <strong>{category.name}</strong> : 
                        category.name}
                </Button>
            ))}
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