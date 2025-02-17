import React from 'react';
import { connect } from 'react-redux';
import Categories from './Categories';
import MenuItems from './MenuItems';
import Paper from '@mui/material/Paper'; // Updated import for MUI
import * as Queries from '../../queries';
import * as Actions from '../../actions';
import PropTypes from 'prop-types';

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
    const token = localStorage.getItem('access_token');
    
    if (!token) {
        console.error('No authentication token found');
        return;
    }

    Queries.getMenu((menu) => {
        console.log('📦 Received menu:', menu);
        
        if (menu) {
            Queries.getOrderTagColors((colors) => {
                if (colors) {
                    this.props.setOrderTagColors(colors);
                }
            }, token);

            this.props.setMenu(menu);
            if (menu.categories && menu.categories.length > 0) {
                this.props.changeSelectedCategory(menu.categories[0].name);
            }
        } else {
            console.error('Failed to load menu');
        }
    }, token);
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
      // Se muestra una notificación o se llama a una acción para reportar el error
      this.props.showMessage('El menú o las categorías no están cargados');
      return;
    }
    const selectedCategory = menu.categories.find(c => c.name === categoryName);
    if (!selectedCategory) {
      this.props.showMessage(`No se encontró la categoría: ${categoryName}`);
      return;
    }
   // Aquí continúa la lógica de actualización de los items basados en la categoría
    // Por ejemplo, se puede despachar una acción para refrescar el estado del menú
    this.props.updateMenuItems(selectedCategory.items);
  }
}

Menu.propTypes = {
    menu: PropTypes.shape({
        categories: PropTypes.arrayOf(PropTypes.shape({
            name: PropTypes.string.required,
            color: PropTypes.string,
            foreground: PropTypes.string
        }))
    }),
    menuItems: PropTypes.array,
    onMenuItemClick: PropTypes.func
};

const mapStateToProps = (state) => ({
    selectedCategory: state.app.get('selectedCategory'),
    menu: state.app.get('menu'),
    terminalId: state.app.get('terminalId')
});

const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const mapDispatchToProps = {
  changeSelectedCategory: Actions.changeSelectedCategory,
  setOrderTagColors: Actions.setOrderTagColors,
  setMenu: Actions.setMenu,
  setMenuItems: Actions.setMenuItems,
  closeMessage: Actions.closeMessage,
};

export default connect(mapStateToProps, mapDispatchToProps)(Menu);
