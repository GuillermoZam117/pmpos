import React from 'react';
import { connect } from 'react-redux';
import Categories from './Categories';
import MenuItems from './MenuItems';
import Paper from '@mui/material/Paper'; // Updated import for MUI
import * as Queries from '../../queries';
import * as Actions from '../../actions';

class Menu extends React.Component {
  componentDidMount() {
    console.log('🔍 Menu mounting, current menu:', this.props.menu);
    if (!this.props.menu) {
        console.log('📋 Refreshing menu...');
        this.refreshMenu();
    }
  }

  render() {
    const {
      menu,
      menuItems,
      onMenuItemClick = () => {},
    } = this.props;
    return (
      <Paper className="menu">
        <Categories
          categories={menu ? menu.categories : undefined}
          onCategoryClick={this.onCategoryClick} // Usa el nombre correcto de la prop
        />
        <MenuItems menuItems={menuItems} onClick={onMenuItemClick} />
      </Paper>
    );
  }

  refreshMenu() {
    console.log('🔄 Getting menu from server...');
    Queries.getMenu((menu) => {
        console.log('📦 Received menu:', menu);
        
        Queries.getOrderTagColors((colors) => {
            console.log('🎨 Received colors:', colors);
            const result = colors.reduce((map, obj) => {
                map[obj.name] = obj.value;
                return map;
            }, {});
            this.props.setOrderTagColors(result);
        });

        this.props.setMenu(menu);
        if (menu.categories[0]) {
            console.log('🔍 Setting initial category:', menu.categories[0].name);
            this.onCategoryClick(menu.categories[0].name);
        }
    });
  }

  onCategoryClick = (category) => {
    console.log('👆 Category clicked:', category);
    this.props.changeSelectedCategory(category);
    this.props.closeMessage();
    this.refreshMenuItems(category);
  };

  refreshMenuItems(categoryName) {
    const { menu } = this.props;
    if (!menu || !menu.categories) {
      console.warn('Menu o menu.categories no están definidos');
      return;
    }
    const selectedCategory = menu.categories.find(c => c.name === categoryName);
    if (!selectedCategory) {
      console.warn(`No se encontró la categoría: ${categoryName}`);
      return;
    }
    // Continuar la lógica con selectedCategory...
  }
}

const mapStateToProps = (state) => ({
    selectedCategory: state.app.get('selectedCategory'),
    menu: state.app.get('menu'),
    terminalId: state.app.get('terminalId')
});

const mapDispatchToProps = {
  changeSelectedCategory: Actions.changeSelectedCategory,
  setOrderTagColors: Actions.setOrderTagColors,
  setMenu: Actions.setMenu,
  setMenuItems: Actions.setMenuItems,
  closeMessage: Actions.closeMessage,
};

export default connect(mapStateToProps, mapDispatchToProps)(Menu);
