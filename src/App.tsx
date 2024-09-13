import React, { useState, useEffect } from "react";
import { Button, Drawer, Select, MenuItem, InputLabel, FormControl, OutlinedInput } from "@mui/material";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import drilldown from 'highcharts/modules/drilldown'; 
import axios from "axios";
import { Category, Product } from "./Types"; 
import { useTheme } from '@mui/material/styles';
import './App.css';


drilldown(Highcharts);

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const App: React.FC = () => {
  const theme = useTheme(); 
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string[]>([]); 
  const [chartData, setChartData] = useState<any>(null);
  const [runReportDisabled, setRunReportDisabled] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const categoryResponse = await axios.get("https://dummyjson.com/products/categories");
        const productResponse = await axios.get("https://dummyjson.com/products");

        const categoriesData: Category[] = categoryResponse.data.map((category: any) => ({
          slug: category.slug,
          name: category.name,
          url: category.url
        }));
        
        const productsData: Product[] = productResponse.data.products.map((product: any) => ({
          title: product.title,
          category: product.category,
          price: product.price
        }));

        setCategories(categoriesData);
        setProducts(productsData);

        const chartData = generatePieChartData(categoriesData, productsData);
        setChartData(chartData);

        console.log("Fetched Categories:", categoriesData);
        console.log("Fetched Products:", productsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  const generatePieChartData = (categories: Category[], products: Product[]) => {
    const pieChartSeries = categories.map((cat) => {
      const count = products.filter(
        (p) => p.category.trim().toLowerCase() === cat.name.trim().toLowerCase()
      ).length || 0;

      return {
        name: cat.name,
        y: count,
        drilldown: cat.name,
      };
    });

    const drilldownSeries = categories.map((cat) => ({
      name: cat.name,
      id: cat.name,
      data: products
        .filter((product) => product.category.trim().toLowerCase() === cat.name.trim().toLowerCase())
        .map((product) => [product.title, product.price]),
    }));

    return {
      chart: { type: 'pie' },
      title: { text: 'Default View - Pie Chart' },
      tooltip: {
        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>',
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '{point.name}: {point.y} products',
          },
        },
      },
      series: [
        {
          name: 'Categories',
          colorByPoint: true,
          data: pieChartSeries,
        },
      ],
      drilldown: { series: drilldownSeries },
    };
  };

  const generateColumnChartData = (category: string, selectedProducts?: string[]) => {
    const filteredProducts = products.filter((product) =>
      product.category.toLowerCase() === category.toLowerCase() &&
      (!selectedProducts || selectedProducts.includes(product.title)) 
    );

    if (filteredProducts.length === 0) {
      return {
        title: { text: `No products found in ${category}` }
      };
    }

    return {
      chart: { type: 'column' },
      title: { text: `Product Prices in ${category}` },
      xAxis: {
        categories: filteredProducts.map((p) => p.title),
        title: { text: "Products" }
      },
      yAxis: { 
        title: { text: "Price (in USD)" } 
      },
      legend: { enabled: false },
      series: [
        {
          name: 'Prices',
          data: filteredProducts.map((p) => [p.title, p.price]), 
          dataLabels: {
            enabled: true, 
            format: '{point.y:.2f}$',
            style: {
              fontSize: '12px',
              color: 'black',
            }
          },
          tooltip: {
            pointFormat: 'Price: <b>${point.y:.2f}</b><br>' 
          },
          colorByPoint: true, 
          borderRadius: 3 
        }
      ],
      plotOptions: {
        column: {
          dataLabels: {
            enabled: true,
          }
        }
      }
    };
  };

  const handleClear = () => {
    setSelectedCategory(null);
    setSelectedProduct([]);
    setChartData(generatePieChartData(categories, products));
    setRunReportDisabled(true);
  };

  const handleRunReport = () => {
    if (selectedCategory) {
      const columnChartData = selectedProduct.length > 0
        ? generateColumnChartData(selectedCategory, selectedProduct)
        : generateColumnChartData(selectedCategory);
  
      setChartData(columnChartData);
      setRunReportDisabled(true);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedProduct([]);
    setRunReportDisabled(false);
  };

  // Multi-select handler for products
  const handleProductChange = (event: any) => {
    const { target: { value } } = event;
    setSelectedProduct(typeof value === 'string' ? value.split(',') : value);
  };

  return (
    <div className="app-container">
      <Drawer variant="permanent" anchor="left" className="sidebar">
        <div className="sidebar-content">
          <div className="header-container">
            <h2>Filters</h2>
            <a onClick={handleClear} className="clear-link">
              Clear
            </a>
          </div>
          <FormControl fullWidth style={{ marginTop: "10px" }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory || ""}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <MenuItem key="default-category" value="">
                Select a Category
              </MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.slug} value={category.name}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth style={{ marginTop: "10px" }}>
            <InputLabel>Product</InputLabel>
            <Select
              multiple
              value={selectedProduct} 
              onChange={handleProductChange}
              input={<OutlinedInput label="Product" />}
              MenuProps={MenuProps}
              disabled={!selectedCategory}
            >
              <MenuItem key="default-product" value="">
                Select Products
              </MenuItem>
              {selectedCategory ? (
                products
                  .filter((product) => product.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase())
                  .map((product) => (
                    <MenuItem key={product.title} value={product.title}>
                      {product.title}
                    </MenuItem>
                  ))
              ) : (
                <MenuItem disabled>No Category Selected</MenuItem>
              )}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            fullWidth
            onClick={handleRunReport}
            style={{ marginTop: "280px" }}
            disabled={runReportDisabled}
          >
            Run Report
          </Button>
        </div>
      </Drawer>

      <div className="main-content">
        <HighchartsReact
          highcharts={Highcharts}
          options={chartData || { title: { text: 'Loading...' } }}
          callback={(chart: any) => {
            console.log("Highcharts chart instance:", chart);
          }}
        />
      </div>
    </div>
  );
};

export default App;
