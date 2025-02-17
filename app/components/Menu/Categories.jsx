import React from 'react';
import { connect } from 'react-redux';
import Button from '@mui/material.Button';

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
    // Add debug logging
    console.log('Categories state:', state?.app?.toJS());
    
    return {
        menu: state.app?.get('menu'),
        selectedCategory: state.app?.get('selectedCategory'),
        categories: state.app?.getIn(['menu', 'categories'])?.toJS() || []
    };
};

export default connect(
    mapStateToProps
)(Categories);