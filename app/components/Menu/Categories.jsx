import React from 'react';
import ReactDom from 'react-dom';
import {connect} from 'react-redux';
import Button from '@mui/material/Button';

class CategoryButton extends React.Component {
    render() {
        const { foreground, selectedCategory, name, color, onClick } = this.props;
        let caption = selectedCategory === name ? <b>-{name}-</b> : name;
        const style ={'color':foreground,
                      'backgroundColor':color,
                      'lineHeight':'1.3',
                      'wordWrap': 'breakWord',
                      'whiteSpace': 'normal',
                      'minHeight': '45px'
                     };
        return <Button
            className = 'categoryButton'
            style = {style}
            onClick={onClick.bind(null, name) }>{caption}</Button>
    }
}

const Categories = ({ menu, selectedCategory, categories = [], onCategoryClick }) => {
  return (
    <div>
      {categories.map(category => (
        <Button
          key={category.name}
          variant={selectedCategory === category.name ? 'contained' : 'outlined'}
          onClick={() => onCategoryClick(category.name)}
        >
          {category.name}
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
)(Categories)