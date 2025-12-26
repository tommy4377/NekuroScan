// @ts-nocheck - Legacy component, needs gradual refactoring
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import React from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { Box, useBreakpointValue } from '@chakra-ui/react';
import AutoSizer from 'react-virtualized-auto-sizer';

export function VirtualGrid({ items, renderItem, minWidth = 160, gap = 16 }) {
  const containerWidth = useBreakpointValue({ base: window.innerWidth - 32, md: 1200 });
  
  const columnCount = Math.floor((containerWidth + gap) / (minWidth + gap));
  const rowCount = Math.ceil(items.length / columnCount);
  const columnWidth = (containerWidth - (columnCount - 1) * gap) / columnCount;
  const rowHeight = columnWidth * 1.5 + gap;

  return (
    <Box height="80vh" width="100%">
      <AutoSizer>
        {({ height, width }) => (
          <Grid
            columnCount={columnCount}
            columnWidth={columnWidth + gap}
            height={height}
            rowCount={rowCount}
            rowHeight={rowHeight}
            width={width}
          >
            {({ columnIndex, rowIndex, style }) => {
              const index = rowIndex * columnCount + columnIndex;
              if (index >= items.length) return null;
              
              return (
                <Box
                  style={{
                    ...style,
                    left: style.left + gap / 2,
                    top: style.top + gap / 2,
                    width: style.width - gap,
                    height: style.height - gap,
                  }}
                >
                  {renderItem(items[index], index)}
                </Box>
              );
            }}
          </Grid>
        )}
      </AutoSizer>
    </Box>
  );
}

export default VirtualGrid;