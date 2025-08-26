import React from 'react';
import { connect } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Categories from './Categories';
import MenuItems from './MenuItems';
import MobileMenu from './MobileMenu';
import Paper from '@mui/material/Paper'; // Updated import for MUI
import * as Actions from '../../actions';
import PropTypes from 'prop-types';

const Menu = (props) => {
  const {
    menu,
    menuItems,
    onMenuItemClick = () => {},
    mobileOptimized = false,
    compact = false,
    changeSelectedCategory,
    closeMessage,
    setMenuItems,
  } = props;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const shouldUseMobileMenu = mobileOptimized || (isMobile && compact);

  React.useEffect(() => {
    console.log('🔍 Menu mounting, current menu:', menu);
    // Don't auto-load menu here - let POSView handle it
    // The menu should be passed as props from the parent component
  }, [menu]);

  const onCategoryClick = (category) => {
    console.log('👆 Category clicked:', category);
    changeSelectedCategory(category);
    closeMessage();
    refreshMenuItems(category);
  };

  const refreshMenuItems = (categoryName) => {
    if (!menu || !menu.categories) {
      // Se muestra una notificación o se llama a una acción para reportar el error
      console.warn('El menú o las categorías no están cargados');
      return;
    }
    
    // Extract categories from both Immutable and plain object formats
    let categories = [];
    if (menu && typeof menu.get === 'function') {
      // Immutable.js format
      categories = menu.get('categories') || [];
      if (categories && typeof categories.toJS === 'function') {
        categories = categories.toJS();
      }
    } else if (menu && menu.categories) {
      // Plain object format
      categories = menu.categories;
    }
    
    const selectedCategory = categories.find(c => c.name === categoryName);
    if (!selectedCategory) {
      console.warn(`No se encontró la categoría: ${categoryName}`);
      return;
    }
    
    // Update menu items for the selected category
    console.log('🔍 Selected category:', selectedCategory);
    if (setMenuItems && selectedCategory.menuItems) {
      console.log('✅ Setting menu items:', selectedCategory.menuItems);
      setMenuItems(selectedCategory.menuItems);
    } else {
      console.warn('❌ No menuItems found in category:', selectedCategory);
    }
  };

  // Show loading if no menu yet
  if (!menu) {
    return (
      <Paper className="menu" sx={{ p: 2, textAlign: 'center' }}>
        <div>Cargando menú...</div>
      </Paper>
    );
  }

  // Use mobile-optimized menu for mobile devices or when explicitly requested
  if (shouldUseMobileMenu) {
    return (
      <MobileMenu
        menu={menu}
        onMenuItemClick={onMenuItemClick}
        compact={compact}
      />
    );
  }
  
  // Use traditional desktop menu
  return (
    <Paper className="menu">
      <Categories
        categories={menu.categories || []}
        onCategoryClick={onCategoryClick}
      />
      <MenuItems menuItems={menuItems} onClick={onMenuItemClick} />
    </Paper>
  );
};

Menu.propTypes = {
    menu: PropTypes.shape({
        categories: PropTypes.arrayOf(PropTypes.shape({
            name: PropTypes.string.isRequired,
            color: PropTypes.string,
            foreground: PropTypes.string
        }))
    }),
    menuItems: PropTypes.array,
    onMenuItemClick: PropTypes.func,
    mobileOptimized: PropTypes.bool,
    compact: PropTypes.bool,
    changeSelectedCategory: PropTypes.func,
    closeMessage: PropTypes.func,
    setMenuItems: PropTypes.func
};

const mapStateToProps = (state) => {
    const appState = state.app;
    
    if (appState && typeof appState.get === 'function') {
        // Immutable.js format
        return {
            selectedCategory: appState.get('selectedCategory'),
            menu: appState.get('menu'),
            menuItems: appState.get('menuItems'),
            terminalId: appState.get('terminalId')
        };
    } else if (appState && typeof appState === 'object') {
        // Plain object format
        return {
            selectedCategory: appState.selectedCategory,
            menu: appState.menu,
            menuItems: appState.menuItems,
            terminalId: appState.terminalId
        };
    }
    
    return {
        selectedCategory: null,
        menu: null,
        menuItems: null,
        terminalId: null
    };
};

const mapDispatchToProps = {
  changeSelectedCategory: Actions.changeSelectedCategory,
  setOrderTagColors: Actions.setOrderTagColors,
  setMenu: Actions.setMenu,
  setMenuItems: Actions.setMenuItems,
  closeMessage: Actions.closeMessage,
};

export default connect(mapStateToProps, mapDispatchToProps)(Menu);
